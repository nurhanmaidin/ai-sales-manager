import { headers } from "next/headers";

// In-memory fixed-window rate limiter. Sufficient for a single-instance MVP;
// swap the store for Redis/Upstash when running multiple instances.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Strict in production; relaxed locally so dev and e2e runs are not throttled.
// RATE_LIMIT_MULTIPLIER lets automated test runs against a production build opt out.
const LIMIT_FACTOR =
  Number(process.env.RATE_LIMIT_MULTIPLIER) || (process.env.NODE_ENV === "production" ? 1 : 50);

export function rateLimit(key: string, baseLimit: number, windowMs: number) {
  const limit = baseLimit * LIMIT_FACTOR;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
