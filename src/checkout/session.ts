import Stripe from "stripe";
import type { Checkout, CheckoutItem, Sku } from "@/src/contract/types";
import { readCatalog, readPot } from "@/src/data/store";
import { authorize, legalSkus } from "@/src/pot/rules";

// Layer: checkout. Re-prices from the catalog, runs the rules again, opens hosted Checkout.

export class CheckoutRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutRefusal";
  }
}

type Priced = { sku: string; name: string; price_pence: number; qty: number };

export async function openCheckout(items: CheckoutItem[], origin: string): Promise<Checkout> {
  const priced = await price(items);
  const total = priced.reduce((sum, item) => sum + item.price_pence * item.qty, 0);
  const pot = await readPot();
  const verdict = authorize(pot, total);
  if (!verdict.ok) throw new CheckoutRefusal(verdict.error);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");

  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
    line_items: priced.map((item) => ({
      quantity: item.qty,
      price_data: {
        currency: "gbp",
        unit_amount: item.price_pence,
        product_data: { name: item.name },
      },
    })),
    metadata: {
      items: JSON.stringify(priced.map((item) => ({ sku: item.sku, name: item.name, qty: item.qty }))),
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url, session_id: session.id };
}

export async function price(items: CheckoutItem[]): Promise<Priced[]> {
  if (items.length === 0) throw new CheckoutRefusal("Nothing to charge.");

  const pot = await readPot();
  const legal = new Map(legalSkus(pot, await readCatalog()).map((item) => [item.sku, item]));
  const seen = new Set<string>();
  const priced: Priced[] = [];

  for (const item of items) {
    if (!item.sku || seen.has(item.sku)) throw new CheckoutRefusal("Bad line items.");
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 5) {
      throw new CheckoutRefusal("Bad quantity.");
    }
    const product: Sku | undefined = legal.get(item.sku);
    if (!product) throw new CheckoutRefusal("That item is not allowed.");
    seen.add(item.sku);
    priced.push({
      sku: product.sku,
      name: product.name,
      price_pence: product.price_pence,
      qty: item.qty,
    });
  }

  return priced;
}

export function requestOrigin(req: Request): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("No host on the request.");
  return `${proto}://${host}`;
}
