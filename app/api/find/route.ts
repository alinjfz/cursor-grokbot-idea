import { NextResponse } from "next/server";
import { findProducts } from "@/src/discovery/find";
import type { ShoppingBrief } from "@/src/discovery/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const brief: ShoppingBrief = {
      forWhom: String(raw.forWhom || "Myself").slice(0, 80),
      interests: String(raw.interests || "").trim().slice(0, 180),
      occasion: String(raw.occasion || "").trim().slice(0, 180),
      budgetPence: Math.round(Number(raw.budgetPence)),
      country: "GB",
      avoid: String(raw.avoid || "").slice(0, 120),
      refinement: String(raw.refinement || "").slice(0, 80),
      momentType: raw.momentType === "celebrate" ? "celebrate" : "lift",
      previousIds: Array.isArray(raw.previousIds) ? raw.previousIds.filter((id: unknown): id is string => typeof id === "string" && id.startsWith("gid://shopify/")).slice(0, 20) : [],
    };
    if (brief.interests.length < 3 || brief.occasion.length < 3 || !Number.isInteger(brief.budgetPence) || brief.budgetPence < 500 || brief.budgetPence > 200000) {
      return NextResponse.json({ error: "Add an interest, a reason, and a budget from £5 to £2,000." }, { status: 400 });
    }
    const result = await findProducts(brief);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("find failed", error);
    return NextResponse.json({ error: "Search could not finish. Please try again." }, { status: 500 });
  }
}
