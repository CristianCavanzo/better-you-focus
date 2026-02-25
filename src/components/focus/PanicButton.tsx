"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

const MICRO_TASKS = [
  "Abrir el archivo y escribir 1 línea",
  "Hacer 10 respiraciones + volver al editor",
  "Escribir 3 bullets de lo que falta",
  "Hacer 1 commit pequeño",
  "Enviar 1 mensaje útil (sin drama)",
  "Ordenar escritorio 2 min"
];

export function PanicButton({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(MICRO_TASKS[0]);

  const suggestion = useMemo(() => selected, [selected]);

  const send = async () => {
    try {
      await fetch("/api/panic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId, chosenAction: suggestion })
      });
    } catch {}
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-white/10 bg-red-500/15 px-4 py-2 text-sm hover:bg-red-500/20 flex items-center gap-2"
      >
        <AlertTriangle size={16} className="text-red-300" />
        Botón de pánico
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface/90 p-5 shadow-soft"
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Intervención rápida (2–3 min)</div>
                  <div className="mt-1 text-sm text-muted">
                    Un impulso no es una orden. Vas a surfearlo y redirigir energía.
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold">Urge surfing (90s)</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-muted space-y-1">
                  <li>Nota dónde se siente en el cuerpo (pecho, manos, garganta).</li>
                  <li>Respira 4–6. Observa: sube, se sostiene, baja.</li>
                  <li>No negocies. Solo observa 90s.</li>
                </ul>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold">Elige 1 micro-tarea (≤ 2 min)</div>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                >
                  {MICRO_TASKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={async () => {
                    await send();
                    setOpen(false);
                  }}
                  className="rounded-2xl border border-white/10 bg-accent/15 px-4 py-2 text-sm hover:bg-accent/20"
                >
                  Registrar y volver
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
