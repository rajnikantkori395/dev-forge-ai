/**
 * Reusable structured prompt templates (mirror server-side logic in `supabase/functions/ai-assist`).
 * Use payloads with `invokeAiAssist` — prompts are assembled in the Edge Function for security.
 */

export const PROMPT_PAYLOAD_HELPERS = {
  linkedinPost: (input: {
    topic: string;
    tone: string;
    platform: string;
    stack?: string[];
  }) => ({
    topic: input.topic,
    tone: input.tone,
    platform: input.platform,
    preferredStack: input.stack ?? [],
    instruction:
      'Write a punchy developer LinkedIn post. Optimize for curiosity and credibility, not buzzwords.',
  }),

  dailyMissions: (input: {
    role: string;
    experienceLevel: string;
    stack: string[];
    goals: string;
    minutes: number;
  }) => ({
    role: input.role,
    experienceLevel: input.experienceLevel,
    stack: input.stack,
    goals: input.goals,
    dailyMinutes: input.minutes,
    instruction:
      'Balance depth with time-boxed actions. Include one interview-style prompt and one hands-on challenge.',
  }),

  quizQuestion: (input: { topic: string; difficulty: string }) => ({
    topic: input.topic,
    difficulty: input.difficulty,
    instruction:
      'One conceptual MCQ suitable for mobile — avoid trick questions; explanation should teach.',
  }),

  interviewSnippet: (input: { topic: string; seniority: string }) => ({
    topic: input.topic,
    seniority: input.seniority,
    instruction: 'Provide a concise system-design style interview prompt with a short rubric.',
  }),
} as const;
