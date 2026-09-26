import type { ProductFind, ShoppingBrief } from "./types";

const ENDPOINT = "https://catalog.shopify.com/api/ucp/mcp";
const PROFILE = "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";

type RawImage = { type?: string; url?: string; alt_text?: string };
type RawVariant = {
  id?: string;
  url?: string;
  price?: { amount?: number; currency?: string };
  availability?: { available?: boolean };
  media?: RawImage[];
  seller?: { name?: string };
  checkout_url?: string;
};
type RawProduct = {
  id?: string;
  title?: string;
  description?: { plain?: string };
  media?: RawImage[];
  variants?: RawVariant[];
};

async function callCatalog(name: string, catalog: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: { name, arguments: { meta: { "ucp-agent": { profile: PROFILE } }, catalog } },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Shopify search returned ${response.status}.`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "Shopify search failed.");
  const content = body.result?.structuredContent;
  if (!content || content.ucp?.status === "error") throw new Error("Shopify did not return catalog data.");
  return content;
}

export async function searchShopify(query: string, brief: ShoppingBrief): Promise<RawProduct[]> {
  const content = await callCatalog("search_catalog", {
    query,
    context: {
      address_country: brief.country,
      currency: "GBP",
      intent: `${brief.occasion}. Interested in ${brief.interests}.`,
    },
    filters: {
      ships_to: { country: brief.country },
      available: true,
      price: { min: Math.max(500, Math.floor(brief.budgetPence * 0.15)), max: brief.budgetPence },
    },
    pagination: { limit: 20 },
  });
  return Array.isArray(content.products) ? (content.products as RawProduct[]) : [];
}

function secureUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeProduct(product: RawProduct, brief: ShoppingBrief): ProductFind | null {
  if (!product.id || !product.title || !Array.isArray(product.variants)) return null;
  const blocked = brief.avoid.toLowerCase().split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  const text = `${product.title} ${product.description?.plain || ""}`.toLowerCase();
  if (/\b(digital download|downloadable|gift card|gift voucher|printable)\b/.test(text)) return null;
  if (/\b(surprise|mystery|random)\b/i.test(product.title) || (product.description?.plain?.trim().length || 0) < 35) return null;
  if (blocked.some((term) => text.includes(term))) return null;

  for (const variant of product.variants) {
    if (!variant.id || !variant.availability?.available) continue;
    if (variant.price?.currency !== "GBP") continue;
    const pricePence = variant.price.amount;
    if (!Number.isInteger(pricePence) || !pricePence || pricePence > brief.budgetPence) continue;
    const checkoutUrl = secureUrl(variant.checkout_url);
    const productUrl = secureUrl(variant.url);
    if (productUrl && /\.ca$|\.myshopify\.com$/i.test(new URL(productUrl).hostname)) continue;
    const image = variant.media?.find((item) => item.type === "image" && secureUrl(item.url)) ??
      product.media?.find((item) => item.type === "image" && secureUrl(item.url));
    const imageUrl = secureUrl(image?.url);
    if (!checkoutUrl || !productUrl || !imageUrl) continue;
    return {
      id: product.id,
      variantId: variant.id,
      title: product.title,
      description: product.description?.plain?.slice(0, 360) || "",
      imageUrl,
      imageAlt: image?.alt_text || product.title,
      merchant: variant.seller?.name || new URL(productUrl).hostname,
      pricePence,
      currency: "GBP",
      productUrl,
      checkoutUrl,
      reason: "",
      tradeoff: "",
      score: 0,
    };
  }
  return null;
}

export async function refreshProduct(id: string, variantId: string, brief: ShoppingBrief): Promise<ProductFind | null> {
  const content = await callCatalog("get_product", { id, context: { address_country: brief.country, currency: "GBP" } });
  const product = content.product as RawProduct | undefined;
  if (!product) return null;
  const match = { ...product, variants: product.variants?.filter((item) => item.id === variantId) };
  return normalizeProduct(match, brief);
}
