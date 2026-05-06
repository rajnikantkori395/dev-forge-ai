export type MissionType =
  | 'dev_tip'
  | 'interview'
  | 'challenge'
  | 'explore'
  | 'architecture'
  | 'productivity';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  xp: number;
  level: number;
  streak: number;
  last_active_date: string | null;
  preferred_stack: string[] | null;
  goals: string | null;
  daily_minutes: number | null;
  role: string | null;
  experience_level: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string | null;
  type: MissionType;
  difficulty: Difficulty;
  xp_reward: number;
  mission_date: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface QuizRow {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: Difficulty;
  topic: string;
  explanation: string | null;
  created_at: string;
}

export interface GeneratedPost {
  id: string;
  user_id: string;
  topic: string;
  tone: string | null;
  platform: string | null;
  content: LinkedInPostContent;
  created_at: string;
}

export interface LinkedInPostContent {
  hook?: string;
  explanation?: string;
  cta?: string;
  hashtags?: string[];
  fullPost?: string;
}

export interface ExploreTopic {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  url: string | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

export const QUIZ_TOPICS = [
  'JavaScript',
  'React',
  'Node.js',
  'SQL',
  'AWS',
  'System Design',
  'APIs',
  'Backend engineering',
] as const;

export type QuizTopic = (typeof QUIZ_TOPICS)[number];
