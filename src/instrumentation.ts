/**
 * Next.js instrumentation — trči jednom na boot-u servera.
 * Registruje platform Event Bus subscribere (engine-i slušaju evente).
 * Samo nodejs runtime (subscriberi vuku server-only loyalty logiku).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerPlatformSubscribers } = await import(
      "@/lib/platform/subscribers"
    );
    registerPlatformSubscribers();
  }
}
