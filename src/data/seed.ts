import type { Pot, Sku } from "@/src/contract/types";

// Layer: data, local stand-in. Edit the pot and the catalog here until Supabase is connected.
// £40 set aside. £15 is the most one bundle may spend.

export const seedPot: Pot = {
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

export const seedCatalog: Sku[] = [
  { sku: "NOODLE", name: "midnight noodles", price_pence: 240, tags: ["treat"] },
  { sku: "CHOC", name: "salted chocolate", price_pence: 450, tags: ["treat"] },
  { sku: "TULIP", name: "five tulips", price_pence: 700, tags: ["flowers"] },
  { sku: "COFFEE", name: "home coffee", price_pence: 620, tags: ["treat"] },
  { sku: "CANDLE", name: "kitchen candle", price_pence: 800, tags: ["home"] },
  { sku: "SOCKS", name: "thick socks", price_pence: 900, tags: ["clothes", "size:M"] },
  { sku: "WINE", name: "red wine", price_pence: 1100, tags: ["alcohol"] },
  { sku: "RANUN", name: "ranunculus", price_pence: 1800, tags: ["flowers"] },
  { sku: "JUMPER", name: "heavy jumper", price_pence: 3200, tags: ["clothes", "size:M"] },
];
