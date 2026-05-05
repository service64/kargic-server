import { Schema, model } from 'mongoose';
import { IProduct } from './product.interface';

const productSchema = new Schema<IProduct>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true, trim: true },
    hsCode: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    moq: { type: String, trim: true },
    priceRange: {
      min: { type: Number },
      max: { type: Number },
    },
    currency: {
      type: String,
      trim: true,
      enum: ['USD'],
      default: 'USD',
    },
    productionLeadTime: { type: String, trim: true },
    supplyCapacity: { type: String, trim: true },
    productImages: [{ type: Schema.Types.ObjectId, ref: 'Image', required: true }],
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    shortDescription: { type: String, trim: true },
    specifications: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    stock: { type: Number, min: 0 },
    unit: { type: String, trim: true },
    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    originCountry: { type: String, trim: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      default: 'draft',
    },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      image: { type: Schema.Types.ObjectId, ref: 'Image' },
      keywords: [{ type: String, trim: true }],
    },
  },
  { timestamps: true },
);

productSchema.index({ userId: 1, categoryId: 1 });

export const Product = model<IProduct>('Product', productSchema);
