import type { SectionId } from './section';

export type ChatRole = 'user' | 'assistant';

export type ChatMode = 'ask' | 'fit';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Shape of `POST /api/chat`'s request body. */
export interface ChatRequest {
  messages: ChatMessage[];
  mode?: ChatMode;
}

/** Shape of `POST /api/chat`'s success response. */
export interface ChatResponse {
  /** Assistant reply with any navigation directive stripped out. */
  reply: string;
  /** Section the console should fly the camera to, if the answer is about one. */
  navigate?: SectionId;
  /** Which upstream model actually served the request, as reported by CloudIQ. */
  servedModel?: string;
}

export interface ChatErrorResponse {
  error: string;
}
