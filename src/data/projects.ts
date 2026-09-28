import { Project } from '@/types';

export const projects: Project[] = [
  {
    title: "Care AI Agent",
    description: "An AI-powered virtual agent that handles customer care interactions end-to-end, from querying customer account data and service records to performing actions such as raising complaints, sending notifications, and escalating to live agents when needed.",
    tech: ["Python", "LangGraph", "Agentic AI", "REST APIs", "Azure DevOps"]
  },
  {
    title: "Image AI",
    description: "An AI-powered content moderation platform that validates and filters user-submitted images related to the Kumamon mascot character using multi-agent workflows.",
    tech: ["Python", "FastAPI", "React", "AWS ECS", "AWS Bedrock", "DynamoDB", "S3", "CloudFront", "Docker", "Gemini API", "Claude API"],
    link: "http://kumamon-alb-1722743874.ap-northeast-1.elb.amazonaws.com/",
    image: "/projects/image-ai.png"
  },
  {
    title: "Personal RAG",
    description: "A single-user RAG application for chatting with your own notes, PDFs, bookmarks, and articles, with streamed answers and inline citations pointing to exact source chunks.",
    tech: ["Next.js", "TypeScript", "Supabase", "pgvector", "Gemini API", "Tailwind CSS", "Vercel"],
    link: "https://github.com/nocturnal629/personal-RAG",
    image: "/projects/personal-rag.jpg"
  },
  {
    title: "Delubyo",
    description: "An interactive text adventure game set in the Philippines during a typhoon disaster, where your choices shape the narrative in an immersive storytelling experience inspired by Lifeline and Firewatch.",
    tech: ["TypeScript", "Vite", "OpenAI API", "Claude API", "Gemini API", "Vercel"],
    link: "https://github.com/nocturnal629/Delubyo",
    image: "/projects/delubyo.png"
  },
  {
    title: "Local LLM Runtime",
    description: "General-purpose infrastructure for running LLMs locally on a GPU, exposing a provider-swappable LLMClient abstraction and a FastAPI HTTP layer — designed as a reusable foundation for local RAG pipelines and agent projects.",
    tech: ["Python", "FastAPI", "Ollama", "Pydantic", "NVIDIA CUDA"],
    link: "https://github.com/nocturnal629/local-LLM-runtime",
    image: "/projects/local-llm-runtime.png"
  },
  {
    title: "Outlanders",
    description: "A casual, adventure, and strategy-focused tower defense mobile video game that combines fun gameplay with learning about Philippine Literature, specifically Bugtong (Riddles), Alamat (Legends), Kwentong-bayan (Folktales), and Philippine Mythical Creatures",
    tech: ["C#", "Unity", "ShaderLab", "Mathematica", "HLSL"],
    link: "https://github.com/nocturnal629/Outlanders",
    image: "/projects/outlanders.png"
  }
];
