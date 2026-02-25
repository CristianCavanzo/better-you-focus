"use client";

import { useEffect, useMemo, useRef } from "react";
import { createChart, LineStyle } from "lightweight-charts";

type Point = { time: string; value: number };

export function TradingLineChart({
  title,
  data
}: {
  title: string;
  data: Point[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const safe = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(238,240,247,.75)"
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,.06)" },
        horzLines: { color: "rgba(255,255,255,.06)" }
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,.10)"
      },
      timeScale: {
        borderColor: "rgba(255,255,255,.10)"
      },
      crosshair: {
        vertLine: { color: "rgba(167,139,250,.45)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(167,139,250,.25)", style: LineStyle.Dashed }
      }
    });

    const series = chart.addAreaSeries({
      lineColor: "rgba(167,139,250,1)",
      topColor: "rgba(167,139,250,.22)",
      bottomColor: "rgba(167,139,250,0)",
      lineWidth: 2
    });

    series.setData(safe as any);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [safe]);

  return (
    <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 h-56 w-full" ref={ref} />
    </div>
  );
}
