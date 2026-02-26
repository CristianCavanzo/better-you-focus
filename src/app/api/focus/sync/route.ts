import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { SyncPayload } from "@/src/types/focus";

async function getUserIdOrNull(): Promise<string | null> {
  const { userId } = auth();
  return userId ?? null;
}

export async function POST(req: Request) {
  const userId = await getUserIdOrNull();
  const effectiveUserId = userId ?? "demo";

  const body = (await req.json()) as SyncPayload;

  if (!body?.state?.version || body.state.version !== 1) {
    return NextResponse.json({ ok: false, error: "Invalid state payload" }, { status: 400 });
  }

  const { categories, tasks, blocks, selections, lastLocalEditAt } = body.state;

  await prisma.user.upsert({
    where: { id: effectiveUserId },
    update: {},
    create: { id: effectiveUserId }
  });

  await prisma.$transaction(async (tx) => {
    // categories
    for (const c of categories) {
      await tx.category.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          sortOrder: c.sortOrder,
          defaultSeconds: c.defaultSeconds,
          userId: effectiveUserId
        },
        create: {
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder,
          defaultSeconds: c.defaultSeconds,
          userId: effectiveUserId
        }
      });
    }

    // tasks
    for (const t of tasks) {
      await tx.task.upsert({
        where: { id: t.id },
        update: {
          userId: effectiveUserId,
          categoryId: t.categoryId,
          title: t.title,
          notes: t.notes ?? null,
          priority: t.priority,
          dueAt: t.dueAt ? new Date(t.dueAt) : null,
          estimateMinutes: (t.estimateMinutes ?? null) as any,
          repeatCadence: ((t.repeatCadence ?? "NONE") as any),
          repeatTime: (t.repeatTime ?? null) as any,
          status: t.status,
          sortOrder: t.sortOrder,
          selectedAt: t.selectedAt ? new Date(t.selectedAt) : null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null
        },
        create: {
          id: t.id,
          userId: effectiveUserId,
          categoryId: t.categoryId,
          title: t.title,
          notes: t.notes ?? null,
          priority: t.priority,
          dueAt: t.dueAt ? new Date(t.dueAt) : null,
          estimateMinutes: (t.estimateMinutes ?? null) as any,
          repeatCadence: ((t.repeatCadence ?? "NONE") as any),
          repeatTime: (t.repeatTime ?? null) as any,
          status: t.status,
          sortOrder: t.sortOrder,
          selectedAt: t.selectedAt ? new Date(t.selectedAt) : null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null
        }
      });
    }

    // blocks
    for (const b of blocks) {
      await tx.focusBlock.upsert({
        where: { id: b.id },
        update: {
          userId: effectiveUserId,
          categoryId: b.categoryId,
          status: b.status,
          plannedSeconds: b.plannedSeconds,
          actualSeconds: b.actualSeconds ?? null,
          startedAt: b.startedAt ? new Date(b.startedAt) : null,
          endedAt: b.endedAt ? new Date(b.endedAt) : null,
          endReason: b.endReason ?? null,
          allSelectedCompleted: b.allSelectedCompleted
        },
        create: {
          id: b.id,
          userId: effectiveUserId,
          categoryId: b.categoryId,
          status: b.status,
          plannedSeconds: b.plannedSeconds,
          actualSeconds: b.actualSeconds ?? null,
          startedAt: b.startedAt ? new Date(b.startedAt) : null,
          endedAt: b.endedAt ? new Date(b.endedAt) : null,
          endReason: b.endReason ?? null,
          allSelectedCompleted: b.allSelectedCompleted
        }
      });
    }

    // selections
    for (const s of selections) {
      await tx.focusBlockSelection.upsert({
        where: { id: s.id },
        update: {
          blockId: s.blockId,
          taskId: s.taskId,
          sortOrder: s.sortOrder,
          doneAt: s.doneAt ? new Date(s.doneAt) : null
        },
        create: {
          id: s.id,
          blockId: s.blockId,
          taskId: s.taskId,
          sortOrder: s.sortOrder,
          doneAt: s.doneAt ? new Date(s.doneAt) : null
        }
      });
    }

    // watermark para reconciliar hydrate
    const ts = Date.parse(lastLocalEditAt || "");
    await tx.user.update({
      where: { id: effectiveUserId },
      data: { lastStateAt: Number.isFinite(ts) ? new Date(ts) : new Date() }
    });
  });

  return NextResponse.json({ ok: true, serverSavedAt: new Date().toISOString() });
}
