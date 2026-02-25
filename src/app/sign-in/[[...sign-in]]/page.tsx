import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface/60 backdrop-blur p-6 shadow-soft">
        <div className="mb-4">
          <div className="text-xl font-semibold">Iniciar sesión</div>
          <div className="text-sm text-muted mt-1">Entra para guardar progreso en tu base de datos.</div>
        </div>
        <SignIn />
      </div>
    </main>
  );
}
