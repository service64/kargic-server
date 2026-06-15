export const SITEMAP_CHANGE_FREQUENCIES = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
] as const;

export type SitemapChangeFrequency = (typeof SITEMAP_CHANGE_FREQUENCIES)[number];

export interface ISitemapEntry {
  url: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
  lastModified: Date;
  enabled: boolean;
}

export type SitemapPublicItem = {
  url: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
  lastModified: string;
};

export type SitemapListItem = {
  _id: string;
  url: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
  lastModified: string;
  enabled: boolean;
  updatedAt?: string;
};

export type SitemapDetail = SitemapListItem & {
  createdAt?: string;
};
