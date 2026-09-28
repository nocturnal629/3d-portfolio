import SectionShell from '@/components/ui/SectionShell';
import { profile } from '@/data/profile';
import { categoryIcons, skillIcons } from '@/data/skill-icons';
import { skills } from '@/data/skills';

export default function About() {
  return (
    <SectionShell id="about" title="About">
      <div className="space-y-4">
        {profile.bio.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-balance-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-10 space-y-6">
        <h3 className="hud-label">Systems aboard</h3>

        {skills.map((category) => {
          const CategoryIcon = categoryIcons[category.name];

          return (
            <div key={category.name}>
              <h4 className="flex items-center gap-2 text-sm font-medium text-plasma">
                {CategoryIcon && <CategoryIcon className="h-4 w-4" aria-hidden="true" />}
                {category.name}
              </h4>

              <ul className="mt-2 flex flex-wrap gap-1.5">
                {category.skills.map((skill) => {
                  const SkillIcon = skillIcons[skill];

                  return (
                    <li key={skill} className="chip">
                      {SkillIcon && <SkillIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                      {skill}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
