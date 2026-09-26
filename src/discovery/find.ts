import { normalizeProduct, searchShopify } from "./shopify";
import type { FindResponse, ProductFind, ShoppingBrief, WebSignal } from "./types";

const COMMON = new Set(["and", "the", "for", "with", "that", "this", "gift", "something", "under", "them", "they", "like"]);

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((item) => item.length > 2 && !COMMON.has(item)) ?? [];
}

function makeQueries(brief: ShoppingBrief): string[] {
  const focuses = brief.interests.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  const refinement = brief.refinement.trim();
  const focus = refinement === "Different category" && focuses.length > 1 ? focuses[1] : focuses[0];
  const interest = focus.toLowerCase();
  const searches: string[] = /coffee|espresso|tea/.test(interest) ? ["coffee beans", "coffee mug"]
    : /running|fitness|gym/.test(interest) ? ["running accessories", "sports water bottle"]
    : /gaming|game/.test(interest) ? ["gaming accessories", "gaming snacks"]
    : /desk|tech/.test(interest) ? ["desk accessories", "coffee mug"]
    : /book|read/.test(interest) ? ["books", "reading lamp"]
    : /outdoor|hiking/.test(interest) ? ["outdoor accessories", "water bottle"]
    : [focus || brief.interests];
  return (brief.budgetPence >= 5000 ? searches : searches.slice(0, 1))
    .map((query) => `${query} ${refinement === "Different category" ? "" : refinement}`.trim());
}

function rank(item: ProductFind, brief: ShoppingBrief): ProductFind {
  const title = item.title.toLowerCase();
  const description = item.description.toLowerCase();
  const interestTerms = words(brief.interests);
  const occasionTerms = words(brief.occasion);
  const refinementTerms = words(brief.refinement);
  const matching = interestTerms.filter((term) => title.includes(term) || description.includes(term));
  const titleHits = interestTerms.filter((term) => title.includes(term)).length;
  const occasionHits = occasionTerms.filter((term) => title.includes(term) || description.includes(term)).length;
  const refinementHits = refinementTerms.filter((term) => title.includes(term) || description.includes(term)).length;
  const room = brief.budgetPence - item.pricePence;
  const priceRatio = item.pricePence / brief.budgetPence;
  const giftablePrice = priceRatio >= 0.3 && priceRatio <= 0.9 ? 3 : 0;
  const isDecorativePrint = /\b(print|poster|wall art|sticker|clipart|digital download|artwork)\b/.test(title);
  const betterValue = brief.refinement === "Better value" ? (1 - priceRatio) * 8 : 0;
  const practical = brief.refinement === "More practical" && /\b(tool|organizer|stand|mat|case|holder|kit|bottle|lamp)\b/.test(title) ? 4 : 0;
  const surprising = brief.refinement === "Something surprising" && titleHits < 2 ? 3 : 0;
  const previouslySeen = brief.previousIds?.includes(item.id) ? 20 : 0;
  const liftBonus = brief.momentType === "lift" && /\b(coffee|tea|chocolate|snack|candle|comfort|cozy|cosy|mug|bath|game)\b/.test(title) ? 3 : 0;
  const celebrationBonus = brief.momentType === "celebrate" && /\b(kit|set|bundle|special|premium|edition|gift|game|coffee)\b/.test(title) ? 3 : 0;
  const score = titleHits * 7 + matching.length * 2 + occasionHits + refinementHits * 2 + giftablePrice + betterValue + practical + surprising + liftBonus + celebrationBonus - (isDecorativePrint ? 12 : 0) - previouslySeen;
  const firstSentence = item.description.split(/[.!?]/)[0].trim();
  const detail = firstSentence.length > 135
    ? firstSentence.slice(0, Math.max(firstSentence.lastIndexOf(",", 135), firstSentence.lastIndexOf(" ", 135))).replace(/[,;:]$/, "").trim()
    : firstSentence;
  const reason = detail.length >= 25
    ? `${detail}. It connects with ${matching.slice(0, 2).join(" and ") || brief.interests.trim()} and stays within your limit.`
    : `It connects with ${matching.slice(0, 2).join(" and ") || brief.interests.trim()} and stays within your limit.`;
  const tradeoff = room < brief.budgetPence * 0.12
    ? "Close to your spending limit; shipping may add more."
    : "Shipping and delivery time are confirmed at the seller's checkout.";
  return { ...item, score, reason, tradeoff };
}

async function webSignals(brief: ShoppingBrief): Promise<WebSignal[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${brief.interests} ${brief.occasion} useful gift under £${Math.round(brief.budgetPence / 100)} UK`,
        search_depth: "basic",
        max_results: 3,
        include_answer: false,
        include_images: false,
        country: "united kingdom",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body.results)
      ? body.results.filter((item: WebSignal) => item.title && item.url?.startsWith("https://"))
          .slice(0, 3).map((item: WebSignal) => ({ title: item.title, url: item.url, content: item.content?.slice(0, 180) || "" }))
      : [];
  } catch {
    return [];
  }
}

async function explainWithGateway(items: ProductFind[], brief: ShoppingBrief): Promise<ProductFind[] | null> {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!key || items.length === 0) return null;
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_GATEWAY_MODEL || "google/gemini-2.5-flash",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are Sam, a warm and discerning companion. Choose real products for this person's emotional moment and remembered tastes. Use only supplied IDs and facts. Return JSON: {\"items\":[{\"id\":\"...\",\"reason\":\"one specific, warm sentence connecting the moment and interest to a factual product feature\",\"tradeoff\":\"one honest caveat\"}]}. Do not invent prices, stock, delivery, or features. Avoid therapy language." },
          { role: "user", content: JSON.stringify({ brief, products: items.map(({ id, title, description, merchant, pricePence }) => ({ id, title, description, merchant, pricePence })) }) },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(14000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const parsed = JSON.parse(body.choices?.[0]?.message?.content || "{}") as { items?: { id?: string; reason?: string; tradeoff?: string }[] };
    if (!Array.isArray(parsed.items)) return null;
    const byId = new Map(items.map((item) => [item.id, item]));
    const ranked: ProductFind[] = [];
    for (const entry of parsed.items) {
      const item = entry.id && byId.get(entry.id);
      if (!item || ranked.some((seen) => seen.id === item.id)) continue;
      ranked.push({ ...item, reason: entry.reason?.slice(0, 220) || item.reason, tradeoff: entry.tradeoff?.slice(0, 180) || item.tradeoff });
    }
    return ranked.length ? [...ranked, ...items.filter((item) => !ranked.some((rankedItem) => rankedItem.id === item.id))] : null;
  } catch {
    return null;
  }
}

export async function findProducts(brief: ShoppingBrief): Promise<FindResponse> {
  const queries = makeQueries(brief);
  const raw: { item: Awaited<ReturnType<typeof searchShopify>>[number]; queryIndex: number }[] = [];
  for (const [queryIndex, query] of queries.entries()) {
    try {
      raw.push(...(await searchShopify(query, brief)).map((item) => ({ item, queryIndex })));
    } catch (error) {
      console.error("Shopify search failed", error);
    }
  }
  const seen = new Set<string>();
  let leftOut: FindResponse["leftOut"] = null;
  const normalized = raw.flatMap(({ item, queryIndex }) => {
    const product = normalizeProduct(item, brief);
    if (!product) {
      if (!leftOut && item.title) {
        const variants = item.variants || [];
        const pricedInGbp = variants.some((variant) => variant.price?.currency === "GBP");
        const available = variants.some((variant) => variant.availability?.available);
        leftOut = {
          title: item.title,
          why: !pricedInGbp ? "No verified GBP price" : !available ? "Not currently available" : "Could not verify a buyable option within your limit",
        };
      }
      return [];
    }
    if (seen.has(product.id)) return [];
    seen.add(product.id);
    return [{ ...rank(product, brief), queryIndex }];
  });
  normalized.sort((a, b) => a.queryIndex - b.queryIndex || b.score - a.score || a.pricePence - b.pricePence);
  const candidates: ProductFind[] = [];
  for (const queryIndex of queries.keys()) {
    const source = normalized.filter((item) => item.queryIndex === queryIndex);
    candidates.push(...source.slice(0, queries.length > 1 ? 4 : 8));
  }
  const [gateway, signals] = await Promise.all([explainWithGateway(candidates, brief), webSignals(brief)]);
  return {
    finds: (gateway || candidates).slice(0, 6),
    signals,
    leftOut,
    queries,
    considered: raw.length,
    rejected: raw.length - normalized.length,
    model: gateway ? "gateway" : "rules",
    searchedAt: new Date().toISOString(),
  };
}
