import { NextResponse } from "next/server";
import { getUserIdOrThrow } from "@/src/lib/auth";
import { getDashboardStats } from "@/src/lib/stats";

export async function GET(req: Request) {
  const userId = getUserIdOrThrow();
  const { searchParams } = new URL(req.url);
  const days = Math.min(60, Math.max(7, Number(searchParams.get("days") ?? "14")));
  const data = await getDashboardStats(userId, days);
  return NextResponse.json({ ok: true, ...data });
}
