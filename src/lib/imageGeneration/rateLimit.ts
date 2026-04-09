const requests = new Map<string, { count: number; ts: number }>();

const WINDOW = 60 * 1000; // 1 min
const LIMIT = 5; // max 5 generacija po min

export function rateLimit(ip: string) {
  const now = Date.now();

  const entry = requests.get(ip);

  if (!entry || now - entry.ts > WINDOW) {
    requests.set(ip, { count: 1, ts: now });
    return { ok: true };
  }

  if (entry.count >= LIMIT) {
    return { ok: false };
  }

  entry.count++;
  return { ok: true };
}
