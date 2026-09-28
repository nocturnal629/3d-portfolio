import { NextResponse } from 'next/server';
import { CloudIQError, createChatCompletion, isCloudIQConfigured } from '@/lib/cloudiq';
import { buildSystemPrompt } from '@/lib/knowledge';
import { parseReply } from '@/lib/nav-intent';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import type { ChatMessage, ChatMode } from '@/types';

export const runtime = 'nodejs';
// The dossier is rebuilt per request and the upstream call is never cacheable.
export const dynamic = 'force-dynamic';

/** Fit-check answers are structured and longer, so they get more room. Both
 *  budgets stay well inside CloudIQ's own retry ceiling of 4096. */
const MAX_TOKENS: Record<ChatMode, number> = { ask: 700, fit: 1100 };

const MAX_MESSAGE_LENGTH: Record<ChatMode, number> = { ask: 1_000, fit: 8_000 };

/** Only the most recent turns are forwarded. The system prompt already
 *  carries the full dossier, so long histories add cost without adding
 *  grounding, and they crowd out the dossier in smaller context windows. */
const MAX_HISTORY_MESSAGES = 8;

// Per-IP budget, deliberately tighter than CloudIQ's own 10/min per key so a
// single visitor cannot exhaust the site-wide allowance. See lib/rate-limit.ts
// for why this is a speed bump rather than a guarantee.
const PER_IP_LIMIT = 6;
const PER_IP_WINDOW_MS = 60_000;

function bad(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request body.', 400);
  }

  const { messages, mode: rawMode } = (body ?? {}) as Record<string, unknown>;
  const mode: ChatMode = rawMode === 'fit' ? 'fit' : 'ask';

  if (!Array.isArray(messages) || messages.length === 0) {
    return bad('`messages` must be a non-empty array.', 400);
  }
  if (!messages.every(isChatMessage)) {
    return bad('Each message needs a `role` of "user" or "assistant" and a string `content`.', 400);
  }

  const history = (messages as ChatMessage[]).slice(-MAX_HISTORY_MESSAGES);
  const last = history[history.length - 1];
  if (last.role !== 'user') {
    return bad('The last message must be from the user.', 400);
  }

  const question = last.content.trim();
  if (!question) {
    return bad('Message cannot be empty.', 400);
  }
  if (question.length > MAX_MESSAGE_LENGTH[mode]) {
    return bad(
      `Message is too long \u2014 keep it under ${MAX_MESSAGE_LENGTH[mode]} characters.`,
      400,
    );
  }

  // Checked after validation rather than first, so the request contract is
  // the same whether or not a gateway key is configured — which is what lets
  // api-tests exercise it without burning a real model call.
  if (!isCloudIQConfigured()) {
    return bad('NOVA is offline — this deployment has no model gateway key configured.', 503);
  }

  const limit = checkRateLimit(`chat:${clientIp(request)}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  if (!limit.allowed) {
    return bad(
      'Easy there \u2014 too many transmissions. Try again in a moment.',
      429,
      { 'Retry-After': String(limit.retryAfter) },
    );
  }

  try {
    const { reply, servedModel } = await createChatCompletion(
      buildSystemPrompt(mode),
      history.map((message) => ({ role: message.role, content: message.content.trim() })),
      MAX_TOKENS[mode],
    );

    const parsed = parseReply(reply, question);
    return NextResponse.json({
      reply: parsed.reply,
      navigate: parsed.navigate,
      servedModel,
    });
  } catch (error) {
    if (error instanceof CloudIQError) {
      // The message is already visitor-safe; the gateway's raw error text is
      // deliberately never forwarded.
      console.error('[chat] CloudIQ failure:', error.status, error.message);
      return bad(error.message, error.status);
    }
    console.error('[chat] unexpected failure:', error);
    return bad('Something went wrong reaching NOVA. Please try again.', 500);
  }
}
