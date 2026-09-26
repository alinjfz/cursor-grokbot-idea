import { NextResponse } from "next/server";
import Stripe from "stripe";
import { price } from "@/src/checkout/session";
import { applyPayment } from "@/src/data/store";
import { notifyPaidSession } from "@/src/orders/purchases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status === "paid") {
    try {
      await notifyPaidSession(session);
    } catch (error) {
      console.error("whatsapp confirmation failed", error);
    }
  }
  if (session.payment_status !== "paid" || !session.metadata?.items) {
    return NextResponse.json({ received: true, applied: false });
  }

  let lines: { sku: string; qty: number }[];
  try {
    const parsed = JSON.parse(session.metadata.items) as { sku?: string; qty?: number }[];
    if (!Array.isArray(parsed)) throw new Error("metadata");
    lines = parsed.map((item) => ({ sku: String(item.sku ?? ""), qty: Number(item.qty) }));
  } catch {
    return NextResponse.json({ error: "Bad metadata." }, { status: 400 });
  }

  try {
    const priced = await price(lines);
    const total = priced.reduce((sum, item) => sum + item.price_pence * item.qty, 0);
    if (session.amount_total !== total) {
      console.error("webhook amount mismatch", session.amount_total, total);
      return NextResponse.json({ received: true, applied: false });
    }
    const applied = await applyPayment(
      session.id,
      priced.map((item) => ({ sku: item.sku, name: item.name })),
      total,
    );
    return NextResponse.json({ received: true, applied });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not apply payment." }, { status: 500 });
  }
}
