import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserIdOrNull } from "@/src/lib/auth";

function todayKeyBogota() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function recommend(urge?: number | null, energy?: number | null) {
  const u = typeof urge === "number" ? urge : null;
  const e = typeof energy === "number" ? energy : null;
  const short = (u != null && u >= 7) || (e != null && e <= 4);
  return {
    blockMin: short ? 15 : 25,
    wip: short ? 1 : 3
  };
}

export async function GET() {
  const userId = getUserIdOrNull();
  const effectiveUserId = userId ?? "demo";
  const dateKey = todayKeyBogota();

  const log = await prisma.dailyLog.findUnique({
    where: { userId_dateKey: { userId: effectiveUserId, dateKey } }
  });

  const rec = recommend(log?.urge ?? null, log?.energy ?? null);

  return NextResponse.json({
    ok: true,
    dateKey,
    log,
    rec
  });
}
