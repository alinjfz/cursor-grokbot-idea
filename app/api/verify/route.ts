import { NextResponse } from "next/server";
import { refreshProduct } from "@/src/discovery/shopify";
import type { ShoppingBrief } from "@/src/discovery/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const id = String(raw.id || "");
    const variantId = String(raw.variantId || "");
    const budgetPence = Math.round(Number(raw.budgetPence));
    if (!id.startsWith("gid://shopify/") || !variantId.startsWith("gid://shopify/ProductVariant/") || !Number.isInteger(budgetPence) || budgetPence < 500) {
      return NextResponse.json({ error: "This product could not be verified." }, { status: 400 });
    }
    const brief: ShoppingBrief = {
      forWhom: "Myself", interests: "", occasion: "", budgetPence,
      country: "GB", avoid: String(raw.avoid || "").slice(0, 120), refinement: "",
    };
    const product = await refreshProduct(id, variantId, brief);
    if (!product) return NextResponse.json({ error: "The product changed or is no longer within your budget. Search again." }, { status: 409 });
    return NextResponse.json({ checkoutUrl: product.checkoutUrl, pricePence: product.pricePence }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("verify failed", error);
    return NextResponse.json({ error: "Could not check the latest product details." }, { status: 500 });
  }
}
