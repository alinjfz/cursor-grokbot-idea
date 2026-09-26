import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "sam_companion";
type Profile = {
  name: string; interests: string; avoid: string; budgetPence: number;
  reminder: string; seenIds: string[]; liked: string[];
};

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function profileFromRow(row: Record<string, unknown>): Profile {
  return {
    name: String(row.name), interests: String(row.interests), avoid: String(row.avoid || ""),
    budgetPence: Number(row.budget_pence), reminder: String(row.reminder_time || "").slice(0, 5),
    seenIds: Array.isArray(row.seen_ids) ? row.seen_ids as string[] : [],
    liked: Array.isArray(row.liked_ids) ? row.liked_ids as string[] : [],
  };
}

function safeProfile(raw: Record<string, unknown>): Profile | null {
  const name = String(raw.name || "").trim().slice(0, 40);
  const interests = String(raw.interests || "").trim().slice(0, 180);
  const avoid = String(raw.avoid || "").trim().slice(0, 120);
  const budgetPence = Number(raw.budgetPence);
  const reminder = String(raw.reminder || "");
  if (!name || interests.length < 3 || !Number.isInteger(budgetPence) || budgetPence < 500 || budgetPence > 200000) return null;
  if (reminder && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder)) return null;
  const ids = (value: unknown) => Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.startsWith("gid://shopify/")).slice(-20)
    : [];
  return { name, interests, avoid, budgetPence, reminder, seenIds: ids(raw.seenIds), liked: ids(raw.liked) };
}

async function sessionToken() {
  const value = (await cookies()).get(COOKIE)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export async function GET() {
  const client = db();
  const token = await sessionToken();
  if (!client) return NextResponse.json({ profile: null, storage: "browser" }, { headers: { "Cache-Control": "no-store" } });
  if (!token) return NextResponse.json({ profile: null, storage: "supabase" }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await client.from("companion_profiles").select("*").eq("profile_id", hash(token)).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load Sam's memory." }, { status: 503 });
  return NextResponse.json({ profile: data ? profileFromRow(data) : null, storage: "supabase" }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Persistent memory is not configured." }, { status: 503 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid profile." }, { status: 400 }); }
  const profile = raw && typeof raw === "object" ? safeProfile(raw as Record<string, unknown>) : null;
  if (!profile) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  const existing = await sessionToken();
  const token = existing || randomBytes(32).toString("hex");
  const { error } = await client.from("companion_profiles").upsert({
    profile_id: hash(token), name: profile.name, interests: profile.interests, avoid: profile.avoid,
    budget_pence: profile.budgetPence, reminder_time: profile.reminder || null,
    seen_ids: profile.seenIds, liked_ids: profile.liked, updated_at: new Date().toISOString(),
  }, { onConflict: "profile_id" });
  if (error) {
    console.error("profile save failed", error.code);
    return NextResponse.json({ error: "Could not save Sam's memory." }, { status: 503 });
  }
  const response = NextResponse.json({ profile, storage: "supabase" }, { headers: { "Cache-Control": "no-store" } });
  if (!existing) response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: new URL(req.url).protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export async function DELETE() {
  const client = db();
  const token = await sessionToken();
  if (client && token) {
    const { error } = await client.from("companion_profiles").delete().eq("profile_id", hash(token));
    if (error) return NextResponse.json({ error: "Could not forget this profile." }, { status: 503 });
  }
  const response = NextResponse.json({ deleted: true });
  response.cookies.delete(COOKIE);
  return response;
}
