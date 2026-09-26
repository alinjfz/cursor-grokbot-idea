import { NextResponse } from "next/server";
import { readCatalog } from "@/src/data/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readCatalog());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The catalog did not load." }, { status: 500 });
  }
}
