import { Project } from '@/types';

// Order matters: the Projects section shows the first FEATURED_PROJECT_COUNT
// (see components/sections/Projects.tsx) and folds the rest behind "Show more".
// Cards with and without a banner are paired so each row of the two-column grid
// stays visually balanced.
export const projects: Project[] = [
  {
    title: "Nyx",
    description: "A local, voice-driven AI desktop companion — an always-on-top, transparent Live2D character that listens, thinks, and talks back in a cloned voice. Speech recognition, the chat model, and voice synthesis all run on-device and stream in real time, with persistent memory and screen-reading for context.",
    tech: ["Python", "PyQt6", "Live2D", "faster-whisper", "Ollama", "Chatterbox-TTS", "CUDA", "SQLite"],
    image: "/projects/nyx.png"
  },
  {
    title: "Image AI",
    description: "An AI-powered content moderation platform that validates and filters user-submitted images related to the Kumamon mascot character using multi-agent workflows.",
    tech: ["Python", "FastAPI", "React", "AWS ECS", "AWS Bedrock", "DynamoDB", "S3", "CloudFront", "Docker", "Gemini API", "Claude API"],
    link: "http://kumamon-alb-526093523.ap-northeast-1.elb.amazonaws.com/",
    image: "/projects/image-ai.png"
  },
  {
    title: "JupiterCode",
    description: "An MCP server that shows every developer's Claude Code instance which files their teammates' agents are editing, so they stop silently overwriting each other across networks. Claims are advisory and auto-expire, and an LLM pass flags related edits to different files, validated against real claims before it is shown.",
    tech: ["Python", "MCP", "PostgreSQL", "Fly.io", "Claude Code"]
  },
  {
    title: "Care AI Agent",
    description: "An AI-powered virtual agent that handles customer care interactions end-to-end, from querying customer account data and service records to performing actions such as raising complaints, sending notifications, and escalating to live agents when needed.",
    tech: ["Python", "LangGraph", "Agentic AI", "REST APIs", "Azure DevOps"]
  },
  {
    title: "Personal RAG",
    description: "A single-user RAG application for chatting with your own notes, PDFs, bookmarks, and articles, with streamed answers and inline citations pointing to exact source chunks.",
    tech: ["Next.js", "TypeScript", "Supabase", "pgvector", "Gemini API", "Tailwind CSS", "Vercel"],
    link: "https://github.com/nocturnal629/personal-RAG",
    image: "/projects/personal-rag.jpg"
  },
  {
    title: "ETL LLM Feed",
    description: "A scheduled data pipeline that ingests recent page changes from minecraft.wiki every six hours, has Gemini Flash extract topics, a summary, and an interest score for each, and has Gemini Pro write a daily digest, all served through a Next.js dashboard.",
    tech: ["Python", "Gemini API", "Pydantic", "PostgreSQL", "Next.js", "Tailwind CSS", "Vercel Cron"],
    link: "https://github.com/nocturnal629/etl-llm-feed"
  },
  {
    title: "Local LLM Runtime",
    description: "General-purpose infrastructure for running LLMs locally on a GPU, exposing a provider-swappable LLMClient abstraction and a FastAPI HTTP layer — designed as a reusable foundation for local RAG pipelines and agent projects.",
    tech: ["Python", "FastAPI", "Ollama", "Pydantic", "NVIDIA CUDA"],
    link: "https://github.com/nocturnal629/local-LLM-runtime",
    image: "/projects/local-llm-runtime.png"
  },
  {
    title: "Delubyo",
    description: "An interactive text adventure game set in the Philippines during a typhoon disaster, where your choices shape the narrative in an immersive storytelling experience inspired by Lifeline and Firewatch.",
    tech: ["TypeScript", "Vite", "OpenAI API", "Claude API", "Gemini API", "Vercel"],
    link: "https://github.com/nocturnal629/Delubyo",
    image: "/projects/delubyo.png"
  },
  {
    title: "Outlanders",
    description: "A casual, adventure, and strategy-focused tower defense mobile video game that combines fun gameplay with learning about Philippine Literature, specifically Bugtong (Riddles), Alamat (Legends), Kwentong-bayan (Folktales), and Philippine Mythical Creatures",
    tech: ["C#", "Unity", "ShaderLab", "Mathematica", "HLSL"],
    link: "https://github.com/nocturnal629/Outlanders",
    image: "/projects/outlanders.png"
  }
];
