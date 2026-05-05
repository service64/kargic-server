import httpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../errors/AppError";
import { Category } from "../category/category.model";
import { Image } from "../media/image.model";
import { IProduct } from "./product.interface";
import { Product } from "./product.model";
import { ExporterProfile } from "../auth/exporterProfile/exporterProfile.model";
import { User } from "../auth/user/user.model";
import QueryBuilder from "../../builders/QueryBuilder";
import { ActiveRole } from "../auth/user/user.interface";
import {
  DeleteObjectCommand,
  getR2BucketName,
  getR2Client,
} from "../media/r2.client";

type CreatePayload = {
  userId: string;
  productName: string;
  hsCode: string;
  categoryId: string;
  moq?: string;
  priceRange?: { min: number; max: number };
  currency?: "USD";
  productionLeadTime?: string;
  supplyCapacity?: string;
  productImages: string[];
  description?: string;
  shortDescription?: string;
  specifications?: { key: string; value: string }[];
  stock?: number;
  unit?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  originCountry?: string;
  brand?: string;
  tags?: string[];
  status?: "draft" | "active" | "inactive";
  isFeatured?: boolean;
  seo?: {
    title?: string;
    description?: string;
    image?: string;
    keywords?: string[];
  };
};

const makeSlug = (productName: string, option: string) => {
  const base = `${productName}-${option}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}`;
};

const assertCategoryExists = async (categoryId: string) => {
  const category = await Category.findOne({
    _id: new Types.ObjectId(categoryId),
    isDeleted: false,
  }).lean();
  if (!category) {
    throw new AppError("Category not found", httpStatus.NOT_FOUND);
  }
};

const assertImagesExist = async (imageIds: string[]) => {
  if (imageIds.length === 0) {
    return;
  }
  const objectIds = imageIds.map((id) => new Types.ObjectId(id));
  const found = await Image.countDocuments({ _id: { $in: objectIds } });
  if (found !== objectIds.length) {
    throw new AppError(
      "One or more product images not found",
      httpStatus.BAD_REQUEST,
    );
  }
};

const exporterExists = async (userId: string) => {
  const user = await User.findById(new Types.ObjectId(userId));
  if (!user || user.activeRole !== "EXPORTER" || user?.status !== "ACTIVE") {
    throw new AppError("User not found or user is diactivated or deleted || contact admin", httpStatus.NOT_FOUND);
  } 
  const exporter = await ExporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  })
    .select("companyName")
    .lean();
  if (!exporter) {
    throw new AppError("Exporter not found", httpStatus.BAD_REQUEST);
  }

  return exporter;
};

const createProductIntoDB = async (payload: CreatePayload) => {
  await assertCategoryExists(payload.categoryId);
  await assertImagesExist(payload.productImages);
  const exporter = await exporterExists(payload.userId);

  if (payload.seo?.image) {
    await assertImagesExist([payload.seo.image]);
  }

  const productData: IProduct = {
    userId: new Types.ObjectId(payload.userId),
    productName: payload.productName.trim(),
    hsCode: payload.hsCode.trim(),
    categoryId: new Types.ObjectId(payload.categoryId),
    productImages: payload.productImages.map((id) => new Types.ObjectId(id)),
    slug: makeSlug(payload.productName, exporter.companyName),
  };

  if (payload.moq) productData.moq = payload.moq;
  if (payload.priceRange) productData.priceRange = payload.priceRange;
  productData.currency = payload.currency ?? "USD";
  if (payload.productionLeadTime)
    productData.productionLeadTime = payload.productionLeadTime;
  if (payload.supplyCapacity)
    productData.supplyCapacity = payload.supplyCapacity;
  if (payload.description) productData.description = payload.description;
  if (payload.shortDescription)
    productData.shortDescription = payload.shortDescription;
  if (payload.specifications)
    productData.specifications = payload.specifications;
  if (payload.stock !== undefined) productData.stock = payload.stock;
  if (payload.unit) productData.unit = payload.unit;
  if (payload.weight !== undefined) productData.weight = payload.weight;
  if (payload.dimensions) productData.dimensions = payload.dimensions;
  if (payload.originCountry) productData.originCountry = payload.originCountry;
  if (payload.brand) productData.brand = payload.brand;
  if (payload.tags) productData.tags = payload.tags;
  if (payload.status) productData.status = payload.status;
  if (payload.isFeatured !== undefined)
    productData.isFeatured = payload.isFeatured;
  if (payload.seo) {
    const seoData: NonNullable<IProduct["seo"]> = {};
    if (payload.seo.title !== undefined) seoData.title = payload.seo.title;
    if (payload.seo.description !== undefined)
      seoData.description = payload.seo.description;
    if (payload.seo.keywords !== undefined)
      seoData.keywords = payload.seo.keywords;
    if (payload.seo.image !== undefined) {
      seoData.image = new Types.ObjectId(payload.seo.image);
    }
    productData.seo = seoData;
  }

  return Product.create(productData);
};

const assertManagePermission = (
  ownerId: Types.ObjectId,
  userId: string,
  activeRole: ActiveRole,
) => {
  if (activeRole === "ADMIN") return;
  if (String(ownerId) !== userId) {
    throw new AppError("Forbidden", httpStatus.FORBIDDEN);
  }
};

const getProductByIdFromDB = async (id: string) => {
  const product = await Product.findById(id)
    .populate("categoryId", "_id categoryName slug")
    .populate("productImages", "_id url name alt")
    .populate("seo.image", "_id url name alt")
    .lean();

  if (!product) {
    throw new AppError("Product not found", httpStatus.NOT_FOUND);
  }

  return product;
};

const updateMyProductInDB = async (
  id: string,
  userId: string,
  activeRole: ActiveRole,
  body: Record<string, unknown>,
) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError("Product not found", httpStatus.NOT_FOUND);
  }

  assertManagePermission(product.userId, userId, activeRole);

  if (typeof body.categoryId === "string") {
    await assertCategoryExists(body.categoryId);
    product.categoryId = new Types.ObjectId(body.categoryId);
  }

  if (Array.isArray(body.productImages)) {
    const ids = body.productImages as string[];
    await assertImagesExist(ids);
    product.productImages = ids.map((imgId) => new Types.ObjectId(imgId));
  }

  if (body.productName !== undefined) {
    product.productName = String(body.productName).trim();
    product.slug = makeSlug(product.productName, product.hsCode);
  }
  if (body.hsCode !== undefined) {
    product.hsCode = String(body.hsCode).trim();
    product.slug = makeSlug(product.productName, product.hsCode);
  }

  if (body.moq === null) product.moq = undefined;
  else if (typeof body.moq === "string") product.moq = body.moq;

  if (body.currency !== undefined) {
    product.currency = "USD";
  }

  if (body.productionLeadTime === null) product.productionLeadTime = undefined;
  else if (typeof body.productionLeadTime === "string") {
    product.productionLeadTime = body.productionLeadTime;
  }

  if (body.supplyCapacity === null) product.supplyCapacity = undefined;
  else if (typeof body.supplyCapacity === "string") {
    product.supplyCapacity = body.supplyCapacity;
  }

  if (body.description === null) product.description = undefined;
  else if (typeof body.description === "string") product.description = body.description;

  if (body.shortDescription === null) product.shortDescription = undefined;
  else if (typeof body.shortDescription === "string") {
    product.shortDescription = body.shortDescription;
  }

  if (Array.isArray(body.specifications)) {
    product.specifications = body.specifications as IProduct["specifications"];
  }
  if (typeof body.stock === "number") product.stock = body.stock;
  if (body.unit === null) product.unit = undefined;
  else if (typeof body.unit === "string") product.unit = body.unit;
  if (typeof body.weight === "number") product.weight = body.weight;
  if (body.dimensions && typeof body.dimensions === "object") {
    product.dimensions = body.dimensions as IProduct["dimensions"];
  }
  if (body.originCountry === null) product.originCountry = undefined;
  else if (typeof body.originCountry === "string") product.originCountry = body.originCountry;
  if (body.brand === null) product.brand = undefined;
  else if (typeof body.brand === "string") product.brand = body.brand;
  if (Array.isArray(body.tags)) product.tags = body.tags as string[];
  if (typeof body.status === "string") product.status = body.status as IProduct["status"];
  if (typeof body.isFeatured === "boolean") product.isFeatured = body.isFeatured;
  if (body.priceRange && typeof body.priceRange === "object") {
    product.priceRange = body.priceRange as IProduct["priceRange"];
  }

  if (body.seo && typeof body.seo === "object") {
    const seoInput = body.seo as Record<string, unknown>;
    const seoCurrent = product.seo ?? {};

    if (seoInput.title === null) seoCurrent.title = undefined;
    else if (typeof seoInput.title === "string") seoCurrent.title = seoInput.title;

    if (seoInput.description === null) seoCurrent.description = undefined;
    else if (typeof seoInput.description === "string") {
      seoCurrent.description = seoInput.description;
    }

    if (seoInput.keywords && Array.isArray(seoInput.keywords)) {
      seoCurrent.keywords = seoInput.keywords as string[];
    }

    if (seoInput.image === null) {
      seoCurrent.image = undefined;
    } else if (typeof seoInput.image === "string") {
      await assertImagesExist([seoInput.image]);
      seoCurrent.image = new Types.ObjectId(seoInput.image);
    }

    product.seo = seoCurrent;
  }

  await product.save();

  return getProductByIdFromDB(id);
};

const deleteMyProductFromDB = async (
  id: string,
  userId: string,
  activeRole: ActiveRole,
) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError("Product not found", httpStatus.NOT_FOUND);
  }

  assertManagePermission(product.userId, userId, activeRole);
  await Product.findByIdAndDelete(id);

  return { deleted: true as const };
};

const deleteProductImageFromDB = async (
  id: string,
  imageId: string,
  userId: string,
  activeRole: ActiveRole,
) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError("Product not found", httpStatus.NOT_FOUND);
  }

  assertManagePermission(product.userId, userId, activeRole);

  const imageObjectId = new Types.ObjectId(imageId);
  const belongsToProduct = product.productImages.some(
    (imgId) => String(imgId) === imageId,
  );

  if (!belongsToProduct) {
    throw new AppError("Image does not belong to this product", httpStatus.BAD_REQUEST);
  }

  product.productImages = product.productImages.filter(
    (imgId) => String(imgId) !== imageId,
  );
  if (product.seo?.image && String(product.seo.image) === imageId) {
    product.seo.image = undefined;
  }
  await product.save();

  const stillUsedInProducts = await Product.exists({
    $or: [{ productImages: imageObjectId }, { "seo.image": imageObjectId }],
  });

  if (!stillUsedInProducts) {
    const imageDoc = await Image.findById(imageObjectId).lean();
    if (imageDoc) {
      const client = getR2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: getR2BucketName(),
          Key: imageDoc.r2_key,
        }),
      );
      await Image.findByIdAndDelete(imageObjectId);
    }
  }

  return { deleted: true as const };
};

const shapeProductListData = (products: unknown[]) => {
  return products.map((product) => {
    const productObj = product as {
      productName?: string;
      hsCode?: string;
      categoryId?: { _id?: Types.ObjectId } | Types.ObjectId;
      priceRange?: { min: number; max: number };
      productImages?: Array<{ _id?: Types.ObjectId } | Types.ObjectId>;
      slug?: string;
      tags?: string[];
      status?: "draft" | "active" | "inactive";
      isFeatured?: boolean;
      views?: number;
      rating?: number;
      totalReviews?: number;
    };

    const populatedCategory = productObj.categoryId;
    const populatedImages = productObj.productImages;

    const categoryId = populatedCategory
      ? typeof populatedCategory === "object" && "_id" in populatedCategory
        ? String(populatedCategory._id)
        : String(populatedCategory)
      : "";

    const productImages = Array.isArray(populatedImages)
      ? populatedImages.map((image) =>
          image && typeof image === "object" && "_id" in image
            ? String(image._id)
            : String(image),
        )
      : [];

    return {
      productName: productObj.productName,
      hsCode: productObj.hsCode,
      categoryId,
      priceRange: productObj.priceRange,
      productImages,
      slug: productObj.slug,
      tags: productObj.tags ?? [],
      status: productObj.status,
      isFeatured: productObj.isFeatured ?? false,
      views: productObj.views ?? 0,
      rating: productObj.rating ?? 0,
      totalReviews: productObj.totalReviews ?? 0,
    };
  });
};

const buildProductListQuery = (
  baseQuery: ReturnType<typeof Product.find>,
  query: Record<string, unknown>,
  extraExcludeFields: string[] = [],
) =>
  new QueryBuilder(baseQuery, query)
    .search(["productName", "hsCode", "slug", "brand", "tags"])
    .filter(extraExcludeFields)
    .sort()
    .fields(
      "productName hsCode categoryId priceRange productImages slug tags status isFeatured views rating totalReviews",
    )
    .paginate({ defaultLimit: 10, maxLimit: 100 });

const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  const productQuery = buildProductListQuery(Product.find(), query);

  const meta = await productQuery.countTotal();
  const products = await productQuery.modelQuery
    .populate("categoryId", "_id")
    .populate("productImages", "_id")
    .lean();

  const data = shapeProductListData(products as unknown[]);

  return { data, meta };
};

const getMyProductsFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const baseQuery = Product.find({ userId: new Types.ObjectId(userId) });
  const productQuery = buildProductListQuery(baseQuery, query, ["userId"]);

  const meta = await productQuery.countTotal();
  const products = await productQuery.modelQuery
    .populate("categoryId", "_id")
    .populate("productImages", "_id")
    .lean();

  const data = shapeProductListData(products as unknown[]);

  return { data, meta };
};

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getMyProductsFromDB,
  getProductByIdFromDB,
  updateMyProductInDB,
  deleteMyProductFromDB,
  deleteProductImageFromDB,
};
