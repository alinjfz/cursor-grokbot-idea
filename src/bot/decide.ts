import type { Bundle, BundleItem, Pot, Sku } from "@/src/contract/types";
import { BOT_JOB } from "@/src/bot/prompt";
import { authorize, legalSkus } from "@/src/pot/rules";

// Layer: bot. Chooses SKUs. Prices always come back from the catalog, not from the model.

const PREFERRED = ["TULIP", "CHOC", "CANDLE"];

type ModelReply = {
  occasion?: unknown;
  items?: unknown;
  left_out?: unknown;
};

export async function decide(pot: Pot, catalog: Sku[]): Promise<Bundle> {
  const legal = legalSkus(pot, catalog);
  if (legal.length === 0) {
    return empty(pot, "Nothing in the catalog is allowed.");
  }

  const apiKey = process.env.XAI_API_KEY;
  if (apiKey) {
    try {
      const drafted = await askGrok(apiKey, pot, legal);
      const bundle = priceDraft(pot, legal, drafted);
      if (bundle) return bundle;
    } catch (error) {
      console.error("decide: grok failed", error);
    }
  }

  return fallback(pot, legal);
}

function empty(pot: Pot, occasion: string): Bundle {
  return {
    items: [],
    total_pence: 0,
    balance_after_pence: pot.balance_pence,
    occasion,
    left_out: [],
  };
}

function priceDraft(pot: Pot, legal: Sku[], draft: ModelReply): Bundle | null {
  const bySku = new Map(legal.map((item) => [item.sku, item]));
  const items: BundleItem[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(draft.items)) return null;
  for (const raw of draft.items) {
    if (!raw || typeof raw !== "object") continue;
    const sku = "sku" in raw && typeof raw.sku === "string" ? raw.sku : "";
    const why = "why" in raw && typeof raw.why === "string" ? raw.why.trim() : "";
    const product = bySku.get(sku);
    if (!product || seen.has(sku) || !why) continue;
    seen.add(sku);
    items.push({
      sku: product.sku,
      name: product.name,
      price_pence: product.price_pence,
      why,
    });
    if (items.length === 3) break;
  }

  const total = items.reduce((sum, item) => sum + item.price_pence, 0);
  if (items.length === 0 || !authorize(pot, total).ok) return null;

  const left = firstLeftOut(draft.left_out, bySku, seen);
  const occasion = typeof draft.occasion === "string" ? draft.occasion.trim() : "";

  return {
    items,
    total_pence: total,
    balance_after_pence: pot.balance_pence - total,
    occasion: occasion || "a small bundle",
    left_out: left ? [left] : [fallbackLeftOut(legal, seen)],
  };
}

function firstLeftOut(
  value: unknown,
  bySku: Map<string, Sku>,
  chosen: Set<string>,
): { sku: string; why: string } | null {
  if (!Array.isArray(value)) return null;
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const sku = "sku" in raw && typeof raw.sku === "string" ? raw.sku : "";
    const why = "why" in raw && typeof raw.why === "string" ? raw.why.trim() : "";
    if (!sku || !why || chosen.has(sku) || !bySku.has(sku)) continue;
    return { sku, why };
  }
  return null;
}

function fallback(pot: Pot, legal: Sku[]): Bundle {
  const bySku = new Map(legal.map((item) => [item.sku, item]));
  const items: BundleItem[] = [];
  let total = 0;
  const room = Math.min(pot.cap_pence, pot.balance_pence);

  for (const sku of PREFERRED) {
    const product = bySku.get(sku);
    if (!product || total + product.price_pence > room) continue;
    items.push({
      sku: product.sku,
      name: product.name,
      price_pence: product.price_pence,
      why: fallbackWhy(product.sku),
    });
    total += product.price_pence;
  }

  if (items.length === 0) {
    const cheapest = [...legal].sort((a, b) => a.price_pence - b.price_pence)[0];
    if (!cheapest || cheapest.price_pence > room) {
      return empty(pot, "Nothing legal fits under the cap.");
    }
    items.push({
      sku: cheapest.sku,
      name: cheapest.name,
      price_pence: cheapest.price_pence,
      why: "The only thing that still fits.",
    });
    total = cheapest.price_pence;
  }

  const chosen = new Set(items.map((item) => item.sku));
  return {
    items,
    total_pence: total,
    balance_after_pence: pot.balance_pence - total,
    occasion: "a tuesday evening",
    left_out: [fallbackLeftOut(legal, chosen)],
  };
}

function fallbackWhy(sku: string): string {
  if (sku === "TULIP") return "Flowers are the part he would not buy for himself.";
  if (sku === "CHOC") return "Same kind of small treat as the noodles, and it still fits the cap.";
  if (sku === "CANDLE") return "Something for the room, still under what the pot allows tonight.";
  return "It fits the cap.";
}

function fallbackLeftOut(legal: Sku[], chosen: Set<string>): { sku: string; why: string } {
  const ranun = legal.find((item) => item.sku === "RANUN" && !chosen.has(item.sku));
  if (ranun) {
    return {
      sku: ranun.sku,
      why: "Ranunculus is prettier than the tulips, and it is over the cap.",
    };
  }
  const other = [...legal]
    .filter((item) => !chosen.has(item.sku))
    .sort((a, b) => b.price_pence - a.price_pence)[0];
  if (!other) return { sku: legal[0].sku, why: "Nothing else was left to drop." };
  return { sku: other.sku, why: "Left out so the bundle stays under the cap." };
}

async function askGrok(apiKey: string, pot: Pot, legal: Sku[]): Promise<ModelReply> {
  const model = process.env.XAI_MODEL || "grok-4";
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BOT_JOB },
        {
          role: "user",
          content: JSON.stringify({
            pot: {
              balance_pence: pot.balance_pence,
              cap_pence: pot.cap_pence,
              bans: pot.bans,
              allow: pot.allow,
              sizes: pot.sizes,
              past_orders: pot.past_orders,
            },
            catalog: legal.map((item) => ({
              sku: item.sku,
              name: item.name,
              price_pence: item.price_pence,
              tags: item.tags,
            })),
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Grok ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Grok returned an empty message");
  return JSON.parse(content) as ModelReply;
}
