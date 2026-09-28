import { Experience } from '@/types';

export const experiences: Experience[] = [
  {
    title: "Full Stack LLM Developer",
    company: "Accenture",
    period: "Dec 2025 - Present",
    logo: "/logos/accenture.png",
    roles: [
      {
        label: "[Backend & DevOps Engineer]",
        responsibilities: [
          "Architected and designed AWS infrastructure for AI-assisted content moderation platform using ECS, ECR, S3, DynamoDB, VPC, ALB, CloudWatch, Secrets Manager, CloudFront, and configured IAM roles, permissions, and team development environments via AWS CodeCommit",
          "Developed FastAPI backend services and scalable database schemas for content upload and review workflows, and deployed both backend and frontend applications to ECS with comprehensive testing of deployments"
        ]
      },
      {
        label: "[Data Engineer]",
        responsibilities: [
          "Developed a Python-Selenium web scraper to automate FAQ content extraction from E& B2B Portal across multiple support categories.",
          "Architected multi-step Agentic AI workflows on the amAIz and led KT sessions for fellow developers on how to utilize the amAIz for building and scaling agents.",
          "Defined and maintained data mappings across API schemas and technical documentation, supporting sprint planning.",
          "Coordinated and tracked System Integration Testing (SIT) across multiple backend systems, documenting blockers, escalating integration issues, and monitoring end-to-end API response coverage across testing layers.",
          "Diagnosed and resolved production and UAT defects in AI agent workflows, improving response accuracy, escalation handling, and system reliability"
        ]
      }
    ]
  },
  {
    title: "Python Backend Developer",
    company: "FiberFin",
    period: "Aug 2025 - Oct 2025",
    logo: "/logos/fiberfin.png",
    responsibilities: [
      "Architected data workflows with SQLAlchemy ORM and standardized API responses",
      "Implemented Alembic migrations for zero-downtime database updates",
      "Orchestrated Docker and Kubernetes containerization for multi-environment deployments",
      "Designed OAuth 2.0 authentication supporting Google and Sage Intacct integrations, with comprehensive token management, CSRF protection, and encrypted credential storage",
      "Implemented Casbin with combined ABAC and RBAC for multi-tenant hierarchies"
    ]
  },
  {
    title: "Software Developer",
    company: "Axie Infinity Limited",
    period: "Oct 2022 - Nov 2024",
    logo: "/logos/axie-infinity.png",
    responsibilities: [
      "Built internal tools with Retool/Jira/Google Sheets/Discord Bot",
      "Automated Discord community engagement for 50K+ users via Python bots",
      "Provided API/GraphQL and game development support for developers and community",
      "Designed automated workflows and business processes via Jira/Retool integrations",
      "Provided technical support to community builders, ensuring timely delivery to engineering"
    ]
  },
  {
    title: "Technical and Game Support",
    company: "Axie Infinity Limited",
    period: "Aug 2021 - Oct 2022",
    logo: "/logos/axie-infinity.png",
    responsibilities: [
      "Provided support to 30K+ players via Discord and Zendesk tickets",
      "Monitored and moderated Discord channels and servers, resolving technical issues and escalating complex cases to engineering teams",
      "Created and maintained a knowledge base for player issues and game guides",
      "Collaborated with cross-functional teams to improve game documentation and support workflows"
    ]
  }
];
