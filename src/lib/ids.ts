export function cuidLike(): string {
  // No es cuid real, pero sirve como id estable en modo demo offline.
  // Si quieres, cambia esto por crypto.randomUUID() o una lib de cuid.
  const rnd = Math.random().toString(36).slice(2);
  const t = Date.now().toString(36);
  return `c${t}${rnd}`.slice(0, 25);
}

export function nowIso(): string {
  return new Date().toISOString();
}
