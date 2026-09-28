import type { ChatMode } from '@/types';

/** Starter prompts shown in an empty console, so visitors get a sense of
 *  what NOVA actually knows instead of facing a blank box. */
export const starterPrompts: Record<ChatMode, string[]> = {
  ask: [
    'What is their AWS experience?',
    'Walk me through the Image AI project.',
    'What have they built with agentic AI?',
    'Which backend stack do they know best?',
  ],
  fit: [
    'Senior Python backend engineer. Must have: FastAPI, PostgreSQL, Docker, AWS. Nice to have: LLM/RAG experience, Kubernetes.',
  ],
};

export const MODE_COPY: Record<ChatMode, { label: string; placeholder: string; hint: string }> = {
  ask: {
    label: 'Ask',
    placeholder: 'Ask about their work, projects, or stack\u2026',
    hint: 'NOVA answers from this site\u2019s content only.',
  },
  fit: {
    label: 'Fit check',
    placeholder: 'Paste a job description or a list of requirements\u2026',
    hint: 'NOVA scores the match and names the gaps honestly.',
  },
};
