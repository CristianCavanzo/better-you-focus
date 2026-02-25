"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/ui";

type Step = {
  id: string;
  title: string;
  why: string;
  action: string;
};

const STEPS: Step[] = [
  {
    id: "breath",
    title: "Respiración diafragmática (45s)",
    why: "Baja activación simpática → más control ejecutivo.",
    action: "Inhala 4s (abdomen), exhala 6s. 6 ciclos."
  },
  {
    id: "woop",
    title: "Contraste mental (WOOP) (30s)",
    why: "Conecta intención con obstáculo real → plan practicable.",
    action: "Wish: 1 bloque. Obstacle: distracción. Plan: si siento impulso → 2 min tarea."
  },
  {
    id: "ifthen",
    title: "Implementation intention (15s)",
    why: "Reduce decisiones en caliente. Automatiza la respuesta.",
    action: "Si abro redes/YouTube → cierro y hago 1 micro-acción (2 min)."
  }
];

export function RitualGate({ onReady }: { onReady: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  const allDone = useMemo(() => STEPS.every((s) => done[s.id]), [done]);

  return (
    <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Ritual de entrada</div>
          <div className="mt-1 text-xs text-muted">Completa esto y luego inicia el Pomodoro.</div>
        </div>
        <button
          className={cn(
            "rounded-2xl border border-white/10 px-4 py-2 text-sm transition",
            allDone ? "bg-accent/15 hover:bg-accent/20" : "bg-white/5 opacity-60 cursor-not-allowed"
          )}
          disabled={!allDone}
          onClick={onReady}
        >
          Entrar a Focus
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setDone((d) => ({ ...d, [s.id]: !d[s.id] }))}
            className={cn(
              "w-full text-left rounded-2xl border border-white/10 p-3 hover:bg-white/5 transition",
              done[s.id] && "bg-white/5"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-muted">{s.action}</div>
                <div className="mt-1 text-[11px] text-white/50">{s.why}</div>
              </div>
              <CheckCircle2 className={cn("mt-1", done[s.id] ? "text-accent" : "text-white/25")} size={20} />
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3 text-xs text-muted"
          >
            Listo. Ahora tu única tarea es ejecutar 1 bloque sin negociar.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
