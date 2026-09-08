export type Tractor = {
  id: number | string;
  slug: string;
  model: string;
  hp: number;
  category: string;
  farmArea: string;
  price: number | null;
  discountPercent?: number | null;
  promotionLabel?: string | null;
  inStock: boolean;
  recommended?: boolean;
  popular?: boolean;
  image: string;
  images?: string[];
  videoUrl?: string | null;
  imageUrl?: string;
  sourceUrl?: string;
  description: string;
  comfort: string;
  equipment?: string[];
  specs: Record<string, string>;
};

export type Lead = {
  id: string;
  tractorSlug: string | null;
  tractorModel: string | null;
  name: string;
  phone: string;
  message: string;
  status: "new" | "contacted" | "closed";
  source: string;
  createdAt: string;
};

export type Locale = "ru" | "ky" | "en";
export type LocalizedText = Record<Locale, string>;
export type NewsCategory = "selection" | "technology" | "field" | "service" | "company";
export type NewsStatus = "draft" | "published" | "archived";

export type NewsPost = {
  slug: string;
  category: NewsCategory;
  status: NewsStatus;
  featured: boolean;
  coverImage: string;
  gallery?: string[];
  publishedAt: string;
  readingMinutes: number;
  author: string;
  relatedTractorSlug?: string | null;
  sourceUrl?: string | null;
  tags: string[];
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
};
