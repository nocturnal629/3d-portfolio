export interface ExperienceRole {
  label: string;
  responsibilities: string[];
}

export interface Experience {
  title: string;
  company: string;
  period: string;
  logo?: string;
  roles?: ExperienceRole[];
  responsibilities?: string[];
}