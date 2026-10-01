import { get, list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// --- Tunables (documented in the feature report) ---------------------------
const MAX_NAME_LENGTH = 9; // leaderboard handle, not a form name
// Convenience ceiling only. There is NO server-side verification of actual
// gameplay — this just rules out absurd/spoofed values, it is not anti-cheat.
const MAX_SCORE = 1_000_000;
const TOP_N = 20;
const BLOB_PREFIX = 'leaderboard/';

// Per-IP budget, mirroring ideas/route.ts: a best-effort, per-instance speed
// bump so one visitor cannot flood the Blob store with submissions.
const PER_IP_LIMIT = 6;
const PER_IP_WINDOW_MS = 60_000;

// Short module-level cache so opening the panel (or a quick re-open after a
// submit) does not re-list and re-fetch every blob on each request. Per-
// instance and best-effort, like the rate limiter.
const CACHE_TTL_MS = 15_000;

export interface LeaderboardEntry {
  name: string;
  score: number;
  createdAt: string;
}

// Hardcoded baseline entry, always merged in at read time. The deployed-only
// BLOB_READ_WRITE_TOKEN means we cannot reliably seed a permanent blob from
// local dev, so this constant guarantees the seed always appears regardless of
// deploy/token state. Real submissions are sorted alongside it.
const BASELINE_ENTRIES: LeaderboardEntry[] = [
  { name: 'Nyx', score: 1560, createdAt: '2024-01-01T00:00:00.000Z' },
];

let cache: { at: number; entries: LeaderboardEntry[] } | null = null;

function sortAndTrim(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
    .slice(0, TOP_N);
}

/** Reads every submitted score blob under the prefix and merges them with the
 *  hardcoded baseline. If the token is missing (local dev) or Blob is
 *  unreachable, degrades gracefully to just the baseline rather than throwing —
 *  the leaderboard must never 500 simply because storage is unavailable. */
async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return sortAndTrim(BASELINE_ENTRIES);

  const submitted: LeaderboardEntry[] = [];
  try {
    let cursor: string | undefined;
    do {
      const result = await list({ prefix: BLOB_PREFIX, token, cursor, limit: 1000 });
      const fetched = await Promise.all(
        result.blobs.map(async (blob) => {
          try {
            // Blobs are written with access: 'private', so they are not
            // publicly fetchable by URL — read them back through the SDK.
            const res = await get(blob.pathname, { access: 'private', token });
            if (!res || res.statusCode !== 200) return null;
            const parsed = (await new Response(res.stream).json()) as Partial<LeaderboardEntry>;
            if (
              typeof parsed?.name === 'string' &&
              typeof parsed?.score === 'number' &&
              typeof parsed?.createdAt === 'string'
            ) {
              return { name: parsed.name, score: parsed.score, createdAt: parsed.createdAt };
            }
          } catch {
            // A single unreadable/corrupt blob should not sink the whole board.
          }
          return null;
        }),
      );
      for (const entry of fetched) {
        if (entry) submitted.push(entry);
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
  } catch (error) {
    console.error('Failed to read leaderboard blobs:', error);
    // Fall through: still return the baseline so the board renders.
  }

  return sortAndTrim([...BASELINE_ENTRIES, ...submitted]);
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ entries: cache.entries });
  }

  const entries = await readLeaderboard();
  cache = { at: now, entries };
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const limit = checkRateLimit(`leaderboard:${clientIp(request)}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, score } = (body ?? {}) as Record<string, unknown>;

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name must be under ${MAX_NAME_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return NextResponse.json(
      { error: 'Score must be a non-negative integer within range.' },
      { status: 400 },
    );
  }

  const entry: LeaderboardEntry = {
    name: trimmedName || 'Anonymous',
    score,
    createdAt: new Date().toISOString(),
  };

  try {
    await put(`${BLOB_PREFIX}${Date.now()}-${score}.json`, JSON.stringify(entry, null, 2), {
      access: 'private',
      addRandomSuffix: true,
      contentType: 'application/json',
      // Force the static read-write token: when a Vercel OIDC token is also
      // present, the SDK prefers it, which fails outside a real deployment.
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    console.error('Failed to save leaderboard score:', error);
    return NextResponse.json(
      { error: 'Could not save your score right now. Please try again later.' },
      { status: 500 },
    );
  }

  // Invalidate the read cache so the new score shows up on next fetch.
  cache = null;

  return NextResponse.json({ success: true });
}
