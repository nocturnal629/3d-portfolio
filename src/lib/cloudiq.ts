import 'server-only';

import type { ChatMessage } from '@/types';

/** CloudIQ is a self-hosted Flask gateway in front of Accenture's ModelIQ.
 *  It speaks an OpenAI-compatible `/v1/chat/completions` shape, authenticates
 *  with an `X-API-Key` header instead of a bearer token, and adds its own
 *  `served_model` field reporting which upstream model actually answered
 *  after its internal fallback chain. See the CloudIQ project's app.py. */
const DEFAULT_BASE_URL = 'https://REDACTED-GATEWAY-HOST';

/** CloudIQ's own default. It is a ModelIQ-native router that scores prompt
 *  complexity and dispatches to a tier, and CloudIQ walks its remaining model
 *  list if the router itself fails — so a single named model here is enough. */
const DEFAULT_MODEL = 'cloudiq-smart';

/** CloudIQ's upstream call has a 60s timeout and the free Render instance
 *  cold-starts, so this has to be generous. Kept under Vercel's default
 *  serverless ceiling. */
const REQUEST_TIMEOUT_MS = 55_000;

export class CloudIQError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** True when the caller should surface a "try again shortly" message
     *  rather than a hard failure. */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'CloudIQError';
  }
}

export interface CloudIQResult {
  reply: string;
  servedModel?: string;
}

interface CloudIQCompletion {
  choices?: { message?: { content?: string | null } }[];
  served_model?: string;
  error?: string;
}

function baseUrl(): string {
  return (process.env.CLOUDIQ_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/** True when the server is configured to talk to CloudIQ at all. Lets the
 *  route return a clear 503 instead of a confusing 401 from upstream. */
export function isCloudIQConfigured(): boolean {
  return Boolean(process.env.CLOUDIQ_API_KEY);
}

export async function createChatCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<CloudIQResult> {
  const apiKey = process.env.CLOUDIQ_API_KEY;
  if (!apiKey) {
    throw new CloudIQError('CLOUDIQ_API_KEY is not set on the server.', 503, false);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        model: process.env.CLOUDIQ_MODEL || DEFAULT_MODEL,
        // A system message of our own also suppresses CloudIQ's default
        // "IQ Bot" identity prompt, which it only injects when the request
        // carries no system role.
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new CloudIQError(
      aborted ? 'The model took too long to respond.' : 'Could not reach the model gateway.',
      504,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // CloudIQ rate-limits per API key (10/min, 200/day for chat). Because
    // every visitor shares this deployment's single key, a 429 here means the
    // whole site's budget is exhausted, not just this visitor's.
    if (response.status === 429) {
      throw new CloudIQError(
        'NOVA is handling a lot of traffic right now. Give it a minute and try again.',
        429,
        true,
      );
    }
    if (response.status === 401) {
      throw new CloudIQError('The gateway rejected this deployment\u2019s API key.', 503, false);
    }
    throw new CloudIQError('The model gateway returned an error.', 502, true);
  }

  let data: CloudIQCompletion;
  try {
    data = (await response.json()) as CloudIQCompletion;
  } catch {
    throw new CloudIQError('The model gateway returned a malformed response.', 502, true);
  }

  const reply = data.choices?.[0]?.message?.content?.trim() || '';
  if (!reply) {
    // CloudIQ already retries reasoning models that burn their whole budget
    // on invisible tokens; an empty body here means that retry also failed.
    throw new CloudIQError('The model returned an empty reply.', 502, true);
  }

  return { reply, servedModel: data.served_model };
}
