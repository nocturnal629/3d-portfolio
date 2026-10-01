import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_NAME_LENGTH = 60;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;

// Per-IP budget. Idea submissions hit Vercel Blob rather than CloudIQ, but the
// same speed bump keeps one visitor from flooding the store. See
// lib/rate-limit.ts for why this is per-instance and best-effort.
const PER_IP_LIMIT = 6;
const PER_IP_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const limit = checkRateLimit(`ideas:${clientIp(request)}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, title, description, company } = (body ?? {}) as Record<string, unknown>;

  // Honeypot: real users never fill this hidden field. Pretend success so bots don't retry.
  if (typeof company === 'string' && company.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const trimmedDescription = typeof description === 'string' ? description.trim() : '';

  if (!trimmedTitle || trimmedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title is required and must be under ${MAX_TITLE_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (!trimmedDescription || trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description is required and must be under ${MAX_DESCRIPTION_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name must be under ${MAX_NAME_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const idea = {
    name: trimmedName || 'Anonymous',
    title: trimmedTitle,
    description: trimmedDescription,
    createdAt: new Date().toISOString(),
  };

  try {
    await put(`ideas/${Date.now()}.json`, JSON.stringify(idea, null, 2), {
      access: 'private',
      addRandomSuffix: true,
      contentType: 'application/json',
      // Force the static read-write token: when a Vercel OIDC token is also
      // present in the environment, the SDK prefers it, which fails outside
      // an actual Vercel deployment (e.g. local dev with pulled prod vars).
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    console.error('Failed to save idea:', error);
    return NextResponse.json(
      { error: 'Could not save your idea right now. Please try again later.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
