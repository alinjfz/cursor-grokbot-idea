// Frozen contract. Change a field only in this file and both callers, in one commit.
// Money is integer pence.

export type Sku = {
  sku: string;
  name: string;
  price_pence: number;
  tags: string[];
};

export type Pot = {
  balance_pence: number;
  cap_pence: number;
  bans: string[];
  allow: string[];
  sizes: string[];
  past_orders: { sku: string; name: string }[];
};

export type BundleItem = {
  sku: string;
  name: string;
  price_pence: number;
  why: string;
};

export type Bundle = {
  items: BundleItem[];
  total_pence: number;
  balance_after_pence: number;
  occasion: string;
  left_out: { sku: string; why: string }[];
  // Optional until the bot fills them. The screen hides each beat when absent.
  evidence?: string;
  sent?: boolean;
};

export type Checkout = {
  url: string;
  session_id: string;
};

export type CheckoutError = {
  error: string;
};

export type CheckoutItem = {
  sku: string;
  qty: number;
};
