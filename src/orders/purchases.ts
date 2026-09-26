import Stripe from "stripe";
import { sendOrderConfirmation, sendWhatsappText } from "@/src/notify/wassist";

export type Purchase = {
  id: string;
  title: string;
  amountPence: number;
  paidAt: string;
  whatsapp: "sent" | "not-sent";
  whatsappNote: string;
};

const inflight = new Set<string>();

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const pounds = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

function paidLabel(unix: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unix * 1000));
}

async function titleFor(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string> {
  const named = session.metadata?.product_name?.trim();
  if (named) return named;
  if (session.metadata?.items) {
    try {
      const parsed = JSON.parse(session.metadata.items) as { name?: string }[];
      const names = parsed.map((item) => item.name?.trim()).filter((name): name is string => Boolean(name));
      if (names.length) return names.join(", ");
    } catch {
      /* Fall through to Stripe line items. */
    }
  }
  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
  const names = lines.data.map((line) => line.description?.trim()).filter((name): name is string => Boolean(name));
  return names.join(", ") || "Good Find order";
}

function noteFor(session: Stripe.Checkout.Session, fallback = ""): string {
  if (session.metadata?.whatsapp_sent === "1") return "Confirmation sent on WhatsApp.";
  return fallback;
}

async function toPurchase(stripe: Stripe, session: Stripe.Checkout.Session, fallbackNote = ""): Promise<Purchase> {
  return {
    id: session.id,
    title: await titleFor(stripe, session),
    amountPence: session.amount_total ?? 0,
    paidAt: paidLabel(session.created),
    whatsapp: session.metadata?.whatsapp_sent === "1" ? "sent" : "not-sent",
    whatsappNote: noteFor(session, fallbackNote),
  };
}

export async function listPurchases(): Promise<Purchase[]> {
  const stripe = stripeClient();
  if (!stripe) return [];
  const page = await stripe.checkout.sessions.list({ limit: 30 });
  const paid = page.data.filter((session) => session.payment_status === "paid");
  return Promise.all(paid.map((session) => toPurchase(stripe, session)));
}

export async function confirmPurchase(sessionId: string): Promise<{ purchase: Purchase | null; banner: string }> {
  const stripe = stripeClient();
  if (!stripe) return { purchase: null, banner: "Stripe is not configured, so purchases cannot be confirmed." };
  if (!sessionId.startsWith("cs_")) return { purchase: null, banner: "That confirmation link is not a Stripe payment." };

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { purchase: null, banner: "This payment is not complete, so it is not on your order list." };
  }

  const fresh = await notifyOnce(stripe, session);
  return {
    purchase: fresh.purchase,
    banner: fresh.purchase.whatsapp === "sent"
      ? `Confirmed. WhatsApp has the receipt for ${fresh.purchase.title}.`
      : fresh.purchase.whatsappNote || "The payment is recorded. WhatsApp was not sent.",
  };
}

async function notifyOnce(stripe: Stripe, session: Stripe.Checkout.Session): Promise<{ purchase: Purchase }> {
  if (session.metadata?.whatsapp_sent === "1" || inflight.has(session.id)) {
    return { purchase: await toPurchase(stripe, session) };
  }

  inflight.add(session.id);
  try {
    const current = await stripe.checkout.sessions.retrieve(session.id);
    if (current.metadata?.whatsapp_sent === "1") {
      return { purchase: await toPurchase(stripe, current) };
    }

    const purchase = await toPurchase(stripe, current);
    const sent = await sendOrderConfirmation({
      to: current.metadata?.notify_phone,
      title: purchase.title,
      amountLabel: pounds(purchase.amountPence),
      paidAt: purchase.paidAt,
    });

    if (!sent.ok) {
      return { purchase: { ...purchase, whatsapp: "not-sent", whatsappNote: sent.error } };
    }

    await stripe.checkout.sessions.update(current.id, {
      metadata: { ...(current.metadata ?? {}), whatsapp_sent: "1" },
    });
    return {
      purchase: {
        ...purchase,
        whatsapp: "sent",
        whatsappNote: "Confirmation sent on WhatsApp.",
      },
    };
  } finally {
    inflight.delete(session.id);
  }
}

export async function sendOutstandingReceipts(to: string): Promise<string> {
  const stripe = stripeClient();
  if (!stripe) return "Stripe is not configured, so there are no receipts to send.";
  const purchases = await listPurchases();
  const pending = purchases.filter((order) => order.whatsapp !== "sent");
  if (purchases.length === 0) return "No paid orders yet.";
  if (pending.length === 0) return "WhatsApp already has a confirmation for these orders.";

  const lines = pending.map((order) => `${order.title} — ${pounds(order.amountPence)} — ${order.paidAt}`);
  const sent = await sendWhatsappText(to, [
    "Good Find confirmation",
    "",
    ...lines,
    "",
    "These are your paid orders. Nothing else will be charged from here.",
  ].join("\n"));
  if (!sent.ok) return sent.error;

  try {
    await Promise.all(pending.map(async (order) => {
      const current = await stripe.checkout.sessions.retrieve(order.id);
      await stripe.checkout.sessions.update(order.id, {
        metadata: { ...(current.metadata ?? {}), whatsapp_sent: "1" },
      });
    }));
  } catch (error) {
    console.error("could not mark whatsapp sent", error);
  }
  return pending.length === 1
    ? "Confirmation sent on WhatsApp for 1 order."
    : `Confirmation sent on WhatsApp for ${pending.length} orders.`;
}

export async function notifyPaidSession(session: Stripe.Checkout.Session): Promise<void> {
  const stripe = stripeClient();
  if (!stripe || session.payment_status !== "paid") return;
  await notifyOnce(stripe, session);
}
