import { auth } from "@clerk/nextjs/server";

export function getUserIdOrThrow(): string {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export function getUserIdOrNull(): string | null {
  const { userId } = auth();
  return userId ?? null;
}
