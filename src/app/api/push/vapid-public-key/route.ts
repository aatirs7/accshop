import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ publicKey: env.VAPID_PUBLIC_KEY ?? null });
}
