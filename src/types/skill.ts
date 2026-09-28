/** Skill data is deliberately icon-free so it can be imported on the server
 *  (the AI grounding document in `src/lib/knowledge.ts` reads it) without
 *  pulling the whole react-icons tree into the route handler's bundle.
 *  Icons are looked up separately, client-side, in `src/data/skill-icons.ts`. */
export interface SkillCategory {
  name: string;
  skills: string[];
}
