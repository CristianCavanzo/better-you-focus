"use client";

import { FocusState } from "@/src/types/focus";
import { getSelectedTasks, getCategoryById } from "@/src/lib/focusLogic";

export function FocusEndSummary({
  state,
  blockId,
  onClose
}: {
  state: FocusState;
  blockId: string;
  onClose: () => void;
}) {
  const block = state.blocks.find((b) => b.id === blockId);
  const selected = getSelectedTasks(state, blockId);

  if (!block) return null;

  const category = getCategoryById(state, block.categoryId);

  const total = selected.length;
  const done = selected.filter((x) => x.task.status === "DONE").length;
  const pending = total - done;

  const statusLabel =
    block.status === "COMPLETED"
      ? "✅ Completado"
      : block.status === "INTERRUPTED"
        ? "⛔ Interrumpido"
        : block.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0c10] p-5">
        <h3 className="text-lg font-semibold">Resumen del bloque</h3>
        <p className="mt-1 text-sm text-white/60">
          Grupo: <span className="text-white/85">{category?.name ?? block.categoryId}</span> ·{" "}
          <span className="text-white/75">{statusLabel}</span>
        </p>

        {block.status === "INTERRUPTED" && block.endReason && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-white/55">Motivo</div>
            <div className="mt-1 text-sm">{block.endReason}</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/55">Seleccionadas</div>
            <div className="text-xl font-semibold">{total}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/55">Completadas</div>
            <div className="text-xl font-semibold">{done}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/55">Pendientes</div>
            <div className="text-xl font-semibold">{pending}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-sm font-medium">
            {block.allSelectedCompleted ? "✅ Objetivo del bloque COMPLETO" : "⏭️ Quedó pendiente algo"}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {block.allSelectedCompleted
              ? "Bien. Esto refuerza continuidad (cierre claro)."
              : "Lo pendiente se mantiene para el siguiente bloque de este grupo."}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
