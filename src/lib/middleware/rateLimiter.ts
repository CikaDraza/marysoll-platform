// src/lib/middleware/rateLimiter.ts
// Simple in-memory rate limiter per API key — 60 req/min.
// NOTE: resets on cold start; use Redis for multi-instance deployments.

const MAX_RPM = 60;
const WINDOW_MS = 60_000;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const entry = store.get(apiKey);

  if (!entry || now > entry.resetAt) {
    store.set(apiKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_RPM) return false;
  entry.count++;
  return true;
}
