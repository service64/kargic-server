import { Types } from 'mongoose';

export interface ISeoMetadata {
  page: string;
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: Types.ObjectId;
}

export type SeoListItem = {
  _id: string;
  page: string;
  title: string;
  ogImage: { _id: string; url: string; alt?: string } | null;
};

export type SeoDetail = {
  _id: string;
  page: string;
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage: { _id: string; url: string; name?: string; alt?: string } | null;
  createdAt?: string;
  updatedAt?: string;
};
