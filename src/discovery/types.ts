export type ShoppingBrief = {
  forWhom: string;
  interests: string;
  occasion: string;
  budgetPence: number;
  country: string;
  avoid: string;
  refinement: string;
  momentType?: "lift" | "celebrate";
  previousIds?: string[];
};

export type ProductFind = {
  id: string;
  variantId: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  merchant: string;
  pricePence: number;
  currency: "GBP";
  productUrl: string;
  checkoutUrl: string;
  reason: string;
  tradeoff: string;
  score: number;
};

export type WebSignal = { title: string; url: string; content: string };

export type FindResponse = {
  finds: ProductFind[];
  signals: WebSignal[];
  leftOut: { title: string; why: string } | null;
  queries: string[];
  considered: number;
  rejected: number;
  model: "gateway" | "rules";
  searchedAt: string;
};
