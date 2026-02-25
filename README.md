# BetterYou Focus (Next.js 14 + Clerk + Prisma + PostgreSQL)

Incluye:
- Pomodoro en Modo Focus
- Tareas por categoría (Trabajo / Estudio / Gym + custom)
- Selección automática de próximas tareas pendientes por bloque
- Si NO terminas una tarea, se queda pendiente para el siguiente bloque de la misma categoría
- Resumen al final del bloque + fuegos artificiales si completaste todo
- Botón **Sync DB** (API + Prisma/PostgreSQL)
 - Login con **Clerk**
 - Dashboard con gráficas estilo TradingView (lightweight-charts)
 - Botón de pánico (urge surfing + micro-acción) con registro en DB
 - Check-in diario rápido (estado emocional + energía)

## Requisitos
- Node 18+
- Docker (para correr PostgreSQL local)

## Setup
1) Levanta PostgreSQL (Opción A: DB en Docker, app local)

```bash
docker compose up -d
```

2) Instala deps
```bash
npm i
```

3) Crea tu `.env` (copia `.env.example`)

```bash
cp .env.example .env
```

Edita `.env` y pega tus keys de Clerk + la `DATABASE_URL`.

4) Migra y genera Prisma
```bash
npx prisma migrate dev -n init
npm run prisma:generate
```

5) Ejecuta
```bash
npm run dev
```

Rutas:
- `/` landing
- `/sign-in` / `/sign-up` (Clerk)
- `/dashboard` (analytics)
- `/focus` (Pomodoro)
- `/check-in` (check-in diario)

## Nota sobre auth (Clerk)
La app usa Clerk middleware para proteger rutas internas.

Si aún no tienes Clerk configurado:
1) Crea una app en Clerk
2) Copia `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` a `.env`

En modo dev, si no hay auth, la API usa usuario `demo` para que puedas probar.
