import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { experiences } from '@/data/experience';
import { certifications } from '@/data/certifications';
import { skills } from '@/data/skills';
import { sections } from '@/data/sections';
import type { ChatMode } from '@/types';

/** Renders every content file into one plain-text dossier. This is what
 *  grounds the assistant: it answers from this text rather than from model
 *  priors, which is the difference between "he has AWS experience" and
 *  "he designed ECS/ECR/DynamoDB infrastructure for a content moderation
 *  platform at Accenture". Regenerated per request, which is cheap
 *  (pure string building over static imports) and means content edits take
 *  effect without a cache bust. */
function buildDossier(): string {
  const lines: string[] = [];

  lines.push('## Identity');
  lines.push(`Name: ${profile.name}`);
  lines.push(`Role: ${profile.role}`);
  lines.push(`Location: ${profile.location}`);
  lines.push(`GitHub: ${profile.socials.github}`);
  lines.push(`LinkedIn: ${profile.socials.linkedin}`);
  lines.push('');

  lines.push('## Biography');
  profile.bio.forEach((paragraph) => lines.push(paragraph));
  lines.push('');

  lines.push('## Work experience (most recent first)');
  experiences.forEach((job) => {
    lines.push(`### ${job.title} — ${job.company} (${job.period})`);
    job.responsibilities?.forEach((item) => lines.push(`- ${item}`));
    job.roles?.forEach((role) => {
      lines.push(`  ${role.label}`);
      role.responsibilities.forEach((item) => lines.push(`  - ${item}`));
    });
    lines.push('');
  });

  lines.push('## Projects');
  projects.forEach((project) => {
    lines.push(`### ${project.title}`);
    lines.push(project.description);
    lines.push(`Tech: ${project.tech.join(', ')}`);
    if (project.link) lines.push(`Link: ${project.link}`);
    lines.push('');
  });

  lines.push('## Certifications');
  certifications.forEach((cert) => {
    lines.push(`- ${cert.name} — ${cert.issuer}${cert.date ? ` (${cert.date})` : ''}`);
  });
  lines.push('');

  lines.push('## Skills');
  skills.forEach((category) => {
    lines.push(`- ${category.name}: ${category.skills.join(', ')}`);
  });

  return lines.join('\n');
}

/** Section ids the model is allowed to navigate to, with the plain-English
 *  description it uses to pick one. */
const NAV_TARGETS = sections
  .map((section) => `- ${section.id}: ${section.label} — ${section.tagline}`)
  .join('\n');

export const NAV_DIRECTIVE_PATTERN = /\n?\[\[NAV:\s*([a-z]+)\s*\]\]\s*$/i;

const SHARED_RULES = `
You are NOVA, the onboard AI of ${profile.name}'s portfolio site — a
space-themed 3D site where each section of the portfolio is a celestial body
the visitor flies between. Speak like a competent ship's computer: concise,
warm, a little dry. Light space metaphor is welcome; do not overdo it.

Hard rules:
- Answer ONLY from the DOSSIER below. It is the complete record.
- If the dossier does not cover something, say so plainly and point to what it
  does cover. Never invent employers, dates, metrics, tools, or projects.
- The site does not state ${profile.name}'s pronouns. Use their name, or
  "they/them". Never guess he/him or she/her.
- Keep answers under 140 words unless the visitor explicitly asks for depth.
- Use plain prose or short bullets. No headings, no markdown tables.
- You are NOVA. Never claim to be Claude, GPT, Gemini, or any other branded AI.

Navigation:
When your answer is mainly about one section of the site, end your reply with a
directive on its own final line, exactly in this form:
[[NAV: <id>]]
Valid ids:
${NAV_TARGETS}
Emit at most one directive, and only when it genuinely matches. Omit it for
greetings, small talk, or anything spanning several sections. The visitor never
sees the directive — it flies the camera to that body.
`.trim();

const ASK_TASK = `
The visitor is asking about ${profile.name} — their background, projects,
experience, skills, or certifications. Answer the question directly.
`.trim();

const FIT_TASK = `
FIT-CHECK MODE. The visitor has pasted a job description or a list of
requirements. Assess how well ${profile.name} matches it, using only the
dossier.

Structure the answer as:
1. A one-line verdict (Strong match / Partial match / Limited match).
2. Three to five bullets. Each names a requirement, labels it Strong, Partial,
   or Gap, and cites the specific role, project, or certification that backs
   the call — or states plainly that the dossier shows no evidence for it.
3. One closing line on the most significant gap.

Be honest about gaps; overselling makes the whole assessment worthless. If the
pasted text is not actually a job description, say so and offer to answer
questions about their background instead.
`.trim();

export function buildSystemPrompt(mode: ChatMode): string {
  const task = mode === 'fit' ? FIT_TASK : ASK_TASK;
  return `${SHARED_RULES}\n\n${task}\n\n=== DOSSIER ===\n${buildDossier()}\n=== END DOSSIER ===`;
}
