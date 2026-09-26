import { NextResponse } from "next/server";
import type { CheckoutItem } from "@/src/contract/types";
import { CheckoutRefusal, openCheckout, requestOrigin } from "@/src/checkout/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let items: CheckoutItem[];
  try {
    const body = (await req.json()) as { items?: CheckoutItem[] };
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "Nothing to charge." }, { status: 409 });
    }
    items = body.items.map((item) => ({
      sku: String(item?.sku ?? ""),
      qty: Number(item?.qty),
    }));
  } catch {
    return NextResponse.json({ error: "Nothing to charge." }, { status: 409 });
  }

  try {
    return NextResponse.json(await openCheckout(items, requestOrigin(req)));
  } catch (error) {
    if (error instanceof CheckoutRefusal) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
