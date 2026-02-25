import { Topbar } from "@/src/components/shell/Topbar";
import { getUserIdOrThrow } from "@/src/lib/auth";
import { getDashboardStats } from "@/src/lib/stats";
import { TradingLineChart } from "@/src/components/charts/TradingLineChart";
import { TradingHistogram } from "@/src/components/charts/TradingHistogram";

export default async function DashboardPage() {
  const userId = getUserIdOrThrow();
  const stats = await getDashboardStats(userId, 14);

  return (
    <div className="space-y-6">
      <Topbar title="Analytics" />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
          <div className="text-xs text-muted">Minutos (14d)</div>
          <div className="mt-2 text-3xl font-semibold">{Math.round(stats.totalMinutes)}</div>
          <div className="mt-1 text-xs text-muted">Tiempo real invertido en foco.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
          <div className="text-xs text-muted">Racha</div>
          <div className="mt-2 text-3xl font-semibold">{stats.streak} días</div>
          <div className="mt-1 text-xs text-muted">Días consecutivos con foco.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
          <div className="text-xs text-muted">Pánico (14d)</div>
          <div className="mt-2 text-3xl font-semibold">{stats.panicSeries.reduce((a, x) => a + x.value, 0)}</div>
          <div className="mt-1 text-xs text-muted">Veces que activaste intervención.</div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TradingLineChart title="Focus minutes / day" data={stats.series} />
        <TradingHistogram title="Panic uses / day" data={stats.panicSeries} />
      </section>
    </div>
  );
}
