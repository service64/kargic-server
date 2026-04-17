import { Types } from "mongoose";

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
    currency?: string;
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
    variants?: {
      name: string; // e.g. Size, Color
      options: string[]; // e.g. ["M", "L"]
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