export type Tractor = {
  id: number | string;
  slug: string;
  model: string;
  hp: number;
  category: string;
  farmArea: string;
  price: number | null;
  inStock: boolean;
  image: string;
  imageUrl?: string;
  sourceUrl?: string;
  description: string;
  comfort: string;
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
