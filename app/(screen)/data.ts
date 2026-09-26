import type { Bundle, Checkout, Pot } from "@/src/contract/types";

// Flip this to true to build the page against frozen JSON, with the API routes ignored.
export const USE_FIXTURES = false;

export const fixturePot: Pot = {
  balance_pence: 4000,
  cap_pence: 1500,
  bans: ["alcohol"],
  allow: [],
  sizes: ["M"],
  past_orders: [
    { sku: "NOODLE", name: "midnight noodles" },
    { sku: "COFFEE", name: "home coffee" },
  ],
};

export const fixtureBundle: Bundle = {
  items: [
    {
      sku: "TULIP",
      name: "five tulips",
      price_pence: 700,
      why: "Flowers are the part he would not buy for himself.",
    },
    {
      sku: "CHOC",
      name: "salted chocolate",
      price_pence: 450,
      why: "Same kind of small treat as the noodles, and it still fits the cap.",
    },
  ],
  total_pence: 1150,
  balance_after_pence: 2850,
  occasion: "a tuesday evening",
    left_out: [
      {
        sku: "RANUN",
        why: "Ranunculus is prettier than the tulips, and it is over the cap.",
      },
    ],
};

async function readJson<T>(res: Response): Promise<T> {
  const body: unknown = await res.json();
  if (!res.ok) {
    const error =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "The request failed.";
    throw new Error(error);
  }
  return body as T;
}

export async function loadPot(): Promise<Pot> {
  if (USE_FIXTURES) return fixturePot;
  const res = await fetch("/api/pot", { cache: "no-store" });
  return readJson<Pot>(res);
}

export async function choose(): Promise<Bundle> {
  if (USE_FIXTURES) return fixtureBundle;
  const res = await fetch("/api/decide", { method: "POST", cache: "no-store" });
  return readJson<Bundle>(res);
}

export async function pay(items: { sku: string; qty: number }[]): Promise<Checkout> {
  if (USE_FIXTURES) throw new Error("Fixtures stay on this page. Pay needs the live route.");
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
  return readJson<Checkout>(res);
}
