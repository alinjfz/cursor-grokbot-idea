import { NextResponse } from "next/server";
import { sendOutstandingReceipts } from "@/src/orders/purchases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const whatsapp = String(form.get("whatsapp") || "");
  let notice = "The WhatsApp confirmation could not be sent.";
  try {
    notice = await sendOutstandingReceipts(whatsapp);
  } catch (error) {
    console.error(error);
  }
  const next = new URL("/orders", req.url);
  next.searchParams.set("notice", notice.slice(0, 400));
  return NextResponse.redirect(next, 303);
}
