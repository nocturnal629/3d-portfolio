/** Single source of truth for identity, contact links, and the About prose.
 *  The AI console's system prompt is built from this file too (see
 *  `src/lib/knowledge.ts`), so editing here updates both the page and the
 *  assistant's grounding. */
export const profile = {
  name: 'Aldrian A',
  role: 'Full Stack LLM Developer',
  location: 'Metropolitan Manila, Philippines',
  callsign: 'ALD-629',
  site: 'https://www.aldrian-a.dev',
  socials: {
    github: 'https://github.com/nocturnal629',
    githubRepos: 'https://github.com/nocturnal629?tab=repositories',
    linkedin: 'https://www.linkedin.com/in/aldrian-a-098558246/',
  },
  bio: [
    'Full Stack LLM Developer at Accenture, working at the intersection of backend engineering, cloud infrastructure, and applied AI. I architect and build AI-assisted systems end-to-end — from AWS infrastructure design and FastAPI backend services to agentic workflow development and frontend integration.',
    'My recent work includes designing multi-agent AI pipelines on AWS Bedrock, building content moderation platforms with ECS, DynamoDB, and CloudFront, and engineering scalable backend services with Python, FastAPI, and PostgreSQL. I\u2019m also comfortable on the frontend, building with React, TypeScript, and Next.js. AWS Certified AI Practitioner and Claude Certified Developer Foundation.',
    'Before AI became central to my work, I spent two years at Axie Infinity building automation tools and supporting a 50K+ user community, then sharpened my backend skills at FiberFin with OAuth 2.0, multi-tenant RBAC, and zero-downtime database migrations. I care about clean, maintainable code and building things that actually solve problems.',
    'Outside of work, I tinker with robotics and explore cybersecurity as side interests — breaking and building things for fun. I also spend a lot of time in Valorant and League of Legends.',
  ],
} as const;
