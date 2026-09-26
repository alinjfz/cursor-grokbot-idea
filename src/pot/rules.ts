import type { Pot, Sku } from "@/src/contract/types";

// Layer: rules. Reads the pot. Authorizes a charge. Does not write, and does not call Stripe.

export type Verdict = { ok: true } | { ok: false; error: string };

// An empty allow-list means no extra restriction. A size tag must match pot.sizes.
export function legalSkus(pot: Pot, catalog: Sku[]): Sku[] {
  return catalog.filter((item) => {
    if (item.price_pence <= 0) return false;
    if (pot.bans.includes(item.sku) || item.tags.some((tag) => pot.bans.includes(tag))) {
      return false;
    }
    if (pot.allow.length > 0 && !pot.allow.includes(item.sku)) return false;
    const size = item.tags.find((tag) => tag.startsWith("size:"))?.slice("size:".length);
    if (size && !pot.sizes.includes(size)) return false;
    return true;
  });
}

export function authorize(pot: Pot, totalPence: number): Verdict {
  if (!Number.isInteger(totalPence) || totalPence <= 0) {
    return { ok: false, error: "Nothing to charge." };
  }
  if (totalPence > pot.cap_pence) {
    return { ok: false, error: "That bundle is over the cap." };
  }
  if (totalPence > pot.balance_pence) {
    return { ok: false, error: "That bundle is more than the pot." };
  }
  return { ok: true };
}
