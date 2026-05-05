import { Types } from "mongoose";

/** All product prices use this currency only. */
export type ProductCurrency = "USD";

export interface IProduct {
    userId: Types.ObjectId;
    productName: string;
    hsCode: string;
    categoryId: Types.ObjectId;
    moq?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    currency?: ProductCurrency;
    productionLeadTime?: string;
    supplyCapacity?: string;
    productImages: Types.ObjectId[];
    slug?: string;
  
    // 🔥 NEW FIELDS
  
    description?: string;  
    shortDescription?: string; 
    specifications?: {
      key: string;
      value: string;
    }[];

    stock?: number; 
    unit?: string; // e.g. piece, kg, ton 
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  
    originCountry?: string;
    brand?: string;
    tags?: string[];
    status?: 'draft' | 'active' | 'inactive';
    isFeatured?: boolean;
    views?: number;
    rating?: number;
    totalReviews?: number;
    seo?: {
      title?: string;
      description?: string;
      image?: Types.ObjectId;
      keywords?: string[];
    };
  }