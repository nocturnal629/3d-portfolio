import { sectionIds } from '@/data/sections';
import { NAV_DIRECTIVE_PATTERN } from '@/lib/knowledge';
import type { SectionId } from '@/types';

const VALID = new Set<string>(sectionIds);

/** Keyword fallback for when the model answers well but forgets the
 *  `[[NAV: id]]` directive — which the smaller models in CloudIQ's fallback
 *  chain do fairly often. Matching on the visitor's own question (rather than
 *  the reply) keeps this predictable: the same question always flies to the
 *  same body. First match in this order wins, so the more specific sections
 *  are listed before the catch-all ones. */
const KEYWORD_ROUTES: { id: SectionId; pattern: RegExp }[] = [
  { id: 'certifications', pattern: /\b(cert(ificat\w*)?|credential|badge|credly|aws certified|accredit\w*)\b/i },
  { id: 'projects', pattern: /\b(project|built|build|portfolio piece|side project|repo|github|shipped|app|demo)\b/i },
  { id: 'experience', pattern: /\b(experience|work|job|role|career|employ\w*|accenture|fiberfin|axie|resume|cv|history)\b/i },
  { id: 'signal', pattern: /\b(contact|reach|hire|email|message|idea|collaborat\w*|get in touch)\b/i },
  { id: 'about', pattern: /\b(about|who is|background|bio|skill|stack|tech|hobb\w*|interest)\b/i },
];

export interface ParsedReply {
  reply: string;
  navigate?: SectionId;
}

/** Strips the trailing navigation directive out of the model's reply and
 *  resolves the section to fly to, falling back to keyword matching on the
 *  visitor's question. */
export function parseReply(raw: string, lastUserMessage: string): ParsedReply {
  const match = raw.match(NAV_DIRECTIVE_PATTERN);
  const reply = (match ? raw.replace(NAV_DIRECTIVE_PATTERN, '') : raw).trim();

  const declared = match?.[1]?.toLowerCase();
  if (declared && VALID.has(declared) && declared !== 'home') {
    return { reply, navigate: declared as SectionId };
  }

  const inferred = KEYWORD_ROUTES.find((route) => route.pattern.test(lastUserMessage));
  return inferred ? { reply, navigate: inferred.id } : { reply };
}
