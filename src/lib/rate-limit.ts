/** Per-IP sliding-window limiter.
 *
 *  This exists because every visitor shares one CloudIQ API key, and CloudIQ
 *  caps that key at 10 requests/minute and 200/day across the entire site.
 *  Without a limit here, one visitor holding down Enter would exhaust the
 *  day's budget for everybody.
 *
 *  State is per-instance and in-memory, so on Vercel it resets on cold start
 *  and is not shared between concurrent lambdas. That makes it a speed bump,
 *  not a security control — CloudIQ's own server-side limit is the real
 *  ceiling. Swap in Vercel KV or Upstash if that stops being good enough. */
interface Window {
  hits: number[];
  /** Epoch ms of the last hit, used to evict idle entries. */
  seen: number;
}

const buckets = new Map<string, Window>();

const MAX_TRACKED_IPS = 5_000;
const EVICT_AFTER_MS = 60 * 60 * 1000;

function evictStale(now: number) {
  for (const [key, window] of buckets) {
    if (now - window.seen > EVICT_AFTER_MS) buckets.delete(key);
  }
  // Hard ceiling in case a flood of unique IPs outpaces the age-based sweep.
  if (buckets.size > MAX_TRACKED_IPS) {
    const overflow = buckets.size - MAX_TRACKED_IPS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit in the window expires. */
  retryAfter: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  evictStale(now);

  const window = buckets.get(key) ?? { hits: [], seen: now };
  window.hits = window.hits.filter((at) => now - at < windowMs);
  window.seen = now;

  if (window.hits.length >= limit) {
    buckets.set(key, window);
    const oldest = window.hits[0];
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
  }

  window.hits.push(now);
  buckets.set(key, window);
  return { allowed: true, retryAfter: 0 };
}

/** Best-effort client IP. Vercel sets `x-forwarded-for`; the leftmost entry is
 *  the original client. Falls back to a shared bucket so a missing header
 *  degrades to a global limit rather than to no limit at all. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'unknown';
}
