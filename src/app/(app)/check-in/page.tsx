import { Topbar } from "@/src/components/shell/Topbar";
import { getUserIdOrThrow } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

function todayKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function CheckInPage() {
  const userId = getUserIdOrThrow();
  const dateKey = todayKey();

  const existing = await prisma.dailyLog.findUnique({
    where: { userId_dateKey: { userId, dateKey } }
  });

  async function save(formData: FormData) {
    "use server";
    const userId = getUserIdOrThrow();
    const dateKey = todayKey();

    const urge = Number(formData.get("urge") ?? "");
    const energy = Number(formData.get("energy") ?? "");
    const emotion = String(formData.get("emotion") ?? "").slice(0, 64);
    const nextStep = String(formData.get("nextStep") ?? "").slice(0, 140);
    const valueActionDone = formData.get("valueActionDone") === "on";

    await prisma.dailyLog.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      update: {
        urge: Number.isFinite(urge) ? urge : null,
        energy: Number.isFinite(energy) ? energy : null,
        emotion: emotion || null,
        nextStep: nextStep || null,
        valueActionDone
      },
      create: {
        userId,
        dateKey,
        urge: Number.isFinite(urge) ? urge : null,
        energy: Number.isFinite(energy) ? energy : null,
        emotion: emotion || null,
        nextStep: nextStep || null,
        valueActionDone
      }
    });
  }

  return (
    <div className="space-y-6">
      <Topbar title="Check-in (60s)" />

      <div className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
        <div className="text-sm font-semibold">Registro ultraligero</div>
        <div className="mt-1 text-xs text-muted">
          Urge 0–10 + emoción + energía + acción de valor. (MVP recomendado en el Word)
        </div>

        <form action={save} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2">
            <div className="text-xs text-muted">Urge (0–10)</div>
            <input
              name="urge"
              type="number"
              min={0}
              max={10}
              defaultValue={existing?.urge ?? ""}
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <div className="text-xs text-muted">Energía (0–10)</div>
            <input
              name="energy"
              type="number"
              min={0}
              max={10}
              defaultValue={existing?.energy ?? ""}
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <div className="text-xs text-muted">Emoción dominante</div>
            <input
              name="emotion"
              defaultValue={existing?.emotion ?? ""}
              placeholder="Ej: ansiedad / aburrimiento / frustración"
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <div className="text-xs text-muted">Siguiente paso (pre-escrito)</div>
            <input
              name="nextStep"
              defaultValue={existing?.nextStep ?? ""}
              placeholder="Ej: abrir PR y escribir 1 comentario"
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              name="valueActionDone"
              type="checkbox"
              defaultChecked={existing?.valueActionDone ?? false}
              className="h-4 w-4"
            />
            <span className="text-sm">Hice 1 acción de valor hoy</span>
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button className="rounded-2xl border border-white/10 bg-accent/15 px-4 py-2 text-sm hover:bg-accent/20">
              Guardar
            </button>
            <div className="text-xs text-muted">
              {existing ? "Ya tienes un check-in hoy (se actualiza)." : "Aún no hay check-in hoy."}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
