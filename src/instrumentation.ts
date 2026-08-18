export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runPendingMigrations } = await import("@/lib/db/migrate");
  await runPendingMigrations();
}
