/**
 * Prompt template IDs → Edge Function `ai-assist` picks the matching system prompt server-side.
 * Payloads always include `templateId` (defaults below) plus module-specific fields.
 */

export const LINKEDIN_TEMPLATE_IDS = ['default', 'technical_deep', 'story', 'listicle'] as const;
export type LinkedinTemplateId = (typeof LINKEDIN_TEMPLATE_IDS)[number];

export const MISSION_TEMPLATE_IDS = ['balanced', 'interview_heavy', 'ship_heavy'] as const;
export type MissionTemplateId = (typeof MISSION_TEMPLATE_IDS)[number];

export const QUIZ_TEMPLATE_IDS = ['conceptual', 'practical', 'architecture'] as const;
export type QuizTemplateId = (typeof QUIZ_TEMPLATE_IDS)[number];

/** Live explore / search lens */
export const EXPLORE_TEMPLATE_IDS = [
  'default',
  'trending_stack',
  'architecture',
  'war_stories',
  'productivity',
  'career_interview',
] as const;
export type ExploreTemplateId = (typeof EXPLORE_TEMPLATE_IDS)[number];

export const INTERVIEW_TEMPLATE_IDS = ['system_design', 'coding_signal', 'behavioral'] as const;
export type InterviewTemplateId = (typeof INTERVIEW_TEMPLATE_IDS)[number];

export const PROMPT_PAYLOAD_HELPERS = {
  linkedinPost: (input: {
    topic: string;
    tone: string;
    platform: string;
    stack?: string[];
    templateId?: LinkedinTemplateId;
  }) => ({
    templateId: input.templateId ?? 'default',
    topic: input.topic,
    tone: input.tone,
    platform: input.platform,
    preferredStack: input.stack ?? [],
  }),

  dailyMissions: (input: {
    role: string;
    experienceLevel: string;
    stack: string[];
    goals: string;
    minutes: number;
    templateId?: MissionTemplateId;
  }) => ({
    templateId: input.templateId ?? 'balanced',
    role: input.role,
    experienceLevel: input.experienceLevel,
    stack: input.stack,
    goals: input.goals,
    dailyMinutes: input.minutes,
  }),

  /** Single quiz card (backward compatible) */
  quizQuestion: (input: {
    topic: string;
    difficulty: string;
    templateId?: QuizTemplateId;
  }) => ({
    templateId: input.templateId ?? 'conceptual',
    topic: input.topic,
    difficulty: input.difficulty,
  }),

  /** Batch for a run — Edge returns `questions` array */
  quizBatch: (input: {
    topic: string;
    difficulty: string;
    count: number;
    templateId?: QuizTemplateId;
  }) => ({
    templateId: input.templateId ?? 'conceptual',
    topic: input.topic,
    difficulty: input.difficulty,
    count: Math.min(10, Math.max(1, input.count)),
  }),

  exploreFeed: (input: {
    query: string;
    templateId?: ExploreTemplateId;
    /** Helps AI personalize without storing PII in prompt title */
    profileHint?: string;
  }) => ({
    templateId: input.templateId ?? 'default',
    query: input.query.trim() || 'software engineering craftsmanship',
    profileHint: input.profileHint ?? '',
  }),

  interviewSnippet: (input: {
    topic: string;
    seniority: string;
    templateId?: InterviewTemplateId;
  }) => ({
    templateId: input.templateId ?? 'system_design',
    topic: input.topic,
    seniority: input.seniority,
  }),
} as const;

/** UI labels for explore template chips */
export const EXPLORE_TEMPLATE_LABELS: Record<ExploreTemplateId, string> = {
  default: 'General',
  trending_stack: 'Trending',
  architecture: 'Architecture',
  war_stories: 'Debug / war stories',
  productivity: 'Productivity',
  career_interview: 'Career',
};
