"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/ui";
import { LayoutDashboard, Timer, ClipboardCheck } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Analytics", icon: LayoutDashboard },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/check-in", label: "Check-in", icon: ClipboardCheck }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex h-[calc(100vh-24px)] sticky top-3 w-72 flex-col rounded-3xl border border-border/10 bg-surface/70 backdrop-blur px-4 py-5 shadow-soft">
      <div className="px-2">
        <div className="text-sm font-semibold tracking-wide">
          BetterYou <span className="text-accent">Focus</span>
        </div>
        <div className="mt-1 text-xs text-muted">TradingView mindset, pero para ti.</div>
      </div>

      <nav className="mt-6 flex-1 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm border border-transparent hover:bg-white/5",
                active && "bg-white/5 border-white/10"
              )}
            >
              <span className={cn("grid place-items-center h-9 w-9 rounded-xl bg-surface2/70 border border-white/10")}>
                <Icon size={18} className={cn(active ? "text-accent" : "text-white/80")} />
              </span>
              <span className={cn(active ? "text-white" : "text-white/80")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl border border-white/10 bg-surface2/60 p-3 text-xs text-muted">
        <div className="font-medium text-white/80">Regla</div>
        <div className="mt-1">Hoy ganas por proceso: 1 bloque + 1 acción de valor.</div>
      </div>
    </aside>
  );
}
