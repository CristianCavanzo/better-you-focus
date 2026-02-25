import { Sidebar } from "@/src/components/shell/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-3 py-3">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-4">
        <Sidebar />
        <div className="min-h-[calc(100vh-24px)] rounded-3xl border border-white/10 bg-surface/40 backdrop-blur shadow-soft p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
