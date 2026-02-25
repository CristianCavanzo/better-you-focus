"use client";

import { UserButton } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-10 w-10 rounded-2xl border border-white/10 bg-surface/70">
          <Sparkles size={18} className="text-accent" />
        </div>
        <div>
          <div className="text-lg font-semibold leading-tight">{title}</div>
          <div className="text-xs text-muted">Menos fricción, más ejecución.</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
      </div>
    </header>
  );
}
