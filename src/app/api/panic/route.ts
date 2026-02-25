import { NextResponse } from 'next/server';
import { getUserIdOrThrow } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export async function POST(req: Request) {
    const userId = getUserIdOrThrow();
    const body = (await req.json().catch(() => null)) as {
        categoryId?: string;
        blockId?: string | null;
        urge?: number;
        emotion?: string;
        chosenAction?: string;
    } | null;

    const categoryId = body?.categoryId ?? null;

    const urge = typeof body?.urge === 'number' ? body?.urge : null;
    const emotion = body?.emotion ? String(body.emotion).slice(0, 64) : null;
    const chosenAction = body?.chosenAction
        ? String(body.chosenAction).slice(0, 140)
        : null;

    await prisma.panicEvent.create({
        data: { userId, categoryId, urge, emotion, chosenAction },
    });

    return NextResponse.json({ ok: true });
}
