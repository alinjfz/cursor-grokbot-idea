import { NextResponse } from "next/server";
import { readPot } from "@/src/data/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readPot());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The pot did not load." }, { status: 500 });
  }
}
