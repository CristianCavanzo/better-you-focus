import { makeInitialState } from "@/src/lib/focusLogic";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

async function getUserIdOrNull(): Promise<string | null> {
  const { userId } = auth();
  return userId ?? null;
}

export async function GET() {
  const userId = await getUserIdOrNull();
  const effectiveUserId = userId ?? "demo";

  // ensure user exists
  const user = await prisma.user.upsert({
    where: { id: effectiveUserId },
    update: {},
    create: { id: effectiveUserId }
  });

  const [categories, tasks, blocks, selections] = await Promise.all([
    prisma.category.findMany({
      where: { userId: effectiveUserId },
      orderBy: { sortOrder: "asc" }
    }),
    prisma.task.findMany({
      where: { userId: effectiveUserId },
      orderBy: [{ categoryId: "asc" }, { priority: "asc" }, { sortOrder: "asc" }]
    }),
    prisma.focusBlock.findMany({
      where: { userId: effectiveUserId },
      orderBy: [{ startedAt: "asc" }]
    }),
    prisma.focusBlockSelection.findMany({
      where: { block: { userId: effectiveUserId } },
      orderBy: [{ blockId: "asc" }, { sortOrder: "asc" }]
    })
  ]);

  // initialize defaults if empty (DB-backed)
  if (categories.length === 0 && tasks.length === 0 && blocks.length === 0) {
    const initial = makeInitialState();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const c of initial.categories) {
        await tx.category.create({
          data: {
            id: c.id,
            userId: effectiveUserId,
            name: c.name,
            sortOrder: c.sortOrder,
            defaultSeconds: c.defaultSeconds
          }
        });
      }
      for (const t of initial.tasks) {
        await tx.task.create({
          data: {
            id: t.id,
            userId: effectiveUserId,
            categoryId: t.categoryId,
            title: t.title,
            status: t.status,
            sortOrder: t.sortOrder,
            priority: t.priority,
            notes: t.notes ?? null
          }
        });
      }
    });

    // we just seeded -> server snapshot matches now
    await prisma.user.update({
      where: { id: effectiveUserId },
      data: { lastStateAt: new Date(initial.lastLocalEditAt) }
    });

    return NextResponse.json({ ok: true, state: initial });
  }

  return NextResponse.json({
    ok: true,
    state: {
      version: 1,
      // critical: MUST be stable, otherwise hydrate will overwrite local edits.
      lastLocalEditAt: user.lastStateAt.toISOString(),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        defaultSeconds: c.defaultSeconds
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        categoryId: t.categoryId,
        title: t.title,
        status: t.status,
        sortOrder: t.sortOrder,
        priority: (t.priority as any) ?? 2,
        notes: t.notes ?? null,
        selectedAt: t.selectedAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null
      })),
      blocks: blocks.map((b) => ({
        id: b.id,
        categoryId: b.categoryId,
        status: b.status,
        plannedSeconds: b.plannedSeconds,
        actualSeconds: b.actualSeconds,
        startedAt: b.startedAt?.toISOString() ?? null,
        endedAt: b.endedAt?.toISOString() ?? null,
        endReason: b.endReason ?? null,
        allSelectedCompleted: b.allSelectedCompleted
      })),
      selections: selections.map((s) => ({
        id: s.id,
        blockId: s.blockId,
        taskId: s.taskId,
        sortOrder: s.sortOrder,
        doneAt: s.doneAt?.toISOString() ?? null
      }))
    }
  });
}
