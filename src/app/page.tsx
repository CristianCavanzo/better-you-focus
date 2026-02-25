import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-semibold tracking-wide">
            BetterYou <span className="text-accent">Focus</span>
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                href="/sign-in"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-2xl border border-white/10 bg-accent/15 px-4 py-2 text-sm hover:bg-accent/20"
              >
                Sign up
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-accent/15 px-4 py-2 text-sm hover:bg-accent/20"
              >
                Ir a Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight">
              Tu productividad como si fuera una <span className="text-accent">inversión</span>.
            </h1>
            <p className="mt-4 text-base text-muted max-w-xl">
              Pomodoro + tareas por categoría + métricas estilo trading. Menos ansiedad, más ejecución.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/focus"
                className="rounded-2xl border border-white/10 bg-accent/15 px-5 py-3 text-sm hover:bg-accent/20"
              >
                Entrar a Modo Focus
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10"
              >
                Ver Analytics
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { t: "Ritual de entrada", d: "Activas el modo Focus antes del bloque." },
                { t: "Pánico anti-recaída", d: "Intervención rápida + registro." },
                { t: "TradingView charts", d: "Ves progreso como una gráfica." }
              ].map((x) => (
                <div key={x.t} className="rounded-3xl border border-white/10 bg-surface/50 p-4">
                  <div className="text-sm font-semibold">{x.t}</div>
                  <div className="mt-1 text-xs text-muted">{x.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[40px] border border-white/10 bg-surface/55 shadow-soft p-6">
            <div className="rounded-3xl border border-white/10 bg-surface2/60 p-5">
              <div className="text-xs text-muted">Hoy</div>
              <div className="mt-2 text-3xl font-semibold">$2,000 goal</div>
              <div className="mt-1 text-sm text-muted">Conecta foco diario → progreso financiero.</div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { k: "Focus", v: "0:00" },
                  { k: "Racha", v: "0 días" },
                  { k: "Pánico", v: "0" },
                  { k: "Tareas", v: "0/0" }
                ].map((x) => (
                  <div key={x.k} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] text-muted">{x.k}</div>
                    <div className="mt-1 text-lg font-semibold">{x.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-xs text-muted">
                * Esto se llena automáticamente cuando haces bloques y check-ins.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
