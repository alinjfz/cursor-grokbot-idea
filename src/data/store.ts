import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Pot, Sku } from "@/src/contract/types";
import { seedCatalog, seedPot } from "@/src/data/seed";

// Layer: data. Supabase when both env vars are set. Otherwise the seed, with the balance held in this process.

type Memory = {
  balance_pence: number;
  past_orders: Pot["past_orders"];
  sessions: Set<string>;
};

const globalStore = globalThis as typeof globalThis & { __potMemory?: Memory };

type PotRow = {
  balance_pence: number;
  cap_pence: number;
  bans: string[] | null;
  allow_skus: string[] | null;
  sizes: string[] | null;
  past_orders: Pot["past_orders"] | null;
};

export type PaidLine = { sku: string; name: string };

function database(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function memory(): Memory {
  if (!globalStore.__potMemory) {
    globalStore.__potMemory = {
      balance_pence: seedPot.balance_pence,
      past_orders: seedPot.past_orders.map((order) => ({ ...order })),
      sessions: new Set(),
    };
  }
  return globalStore.__potMemory;
}

function potFromRow(row: PotRow): Pot {
  return {
    balance_pence: row.balance_pence,
    cap_pence: row.cap_pence,
    bans: row.bans ?? [],
    allow: row.allow_skus ?? [],
    sizes: row.sizes ?? [],
    past_orders: row.past_orders ?? [],
  };
}

export async function readPot(): Promise<Pot> {
  const db = database();
  if (!db) {
    const local = memory();
    return {
      ...seedPot,
      balance_pence: local.balance_pence,
      past_orders: local.past_orders,
    };
  }

  const { data, error } = await db.from("pot").select("*").eq("id", "home").single();
  if (error) throw new Error(error.message);
  return potFromRow(data as PotRow);
}

export async function readCatalog(): Promise<Sku[]> {
  const db = database();
  if (!db) return seedCatalog.map((item) => ({ ...item, tags: [...item.tags] }));

  const { data, error } = await db
    .from("catalog")
    .select("sku, name, price_pence, tags")
    .order("price_pence", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sku[];
}

export async function applyPayment(
  sessionId: string,
  lines: PaidLine[],
  amountPence: number,
): Promise<boolean> {
  const db = database();
  if (!db) {
    const local = memory();
    if (local.sessions.has(sessionId)) return false;
    if (amountPence > local.balance_pence) return false;
    local.sessions.add(sessionId);
    local.balance_pence -= amountPence;
    local.past_orders = [...local.past_orders, ...lines];
    return true;
  }

  const { data, error } = await db.rpc("apply_payment", {
    session_id: sessionId,
    sku_list: lines,
    amount: amountPence,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
