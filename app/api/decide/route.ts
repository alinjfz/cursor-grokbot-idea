import { NextResponse } from "next/server";
import { decide } from "@/src/bot/decide";
import { readCatalog, readPot } from "@/src/data/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const [pot, catalog] = await Promise.all([readPot(), readCatalog()]);
    return NextResponse.json(await decide(pot, catalog));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The bot could not choose." }, { status: 500 });
  }
}
