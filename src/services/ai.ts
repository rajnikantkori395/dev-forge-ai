import { FunctionsHttpError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { PROMPT_PAYLOAD_HELPERS } from '@/lib/prompts/templates';
import type {
  ExploreTemplateId,
  MissionTemplateId,
  QuizTemplateId,
  LinkedinTemplateId,
} from '@/lib/prompts/templates';

export type AiAction =
  | 'linkedin_post'
  | 'daily_missions'
  | 'quiz_question'
  | 'quiz_batch'
  | 'explore_feed'
  | 'interview_snippet';

export async function formatFunctionsInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const status = res.status;
    try {
      const j = (await res.clone().json()) as {
        error?: unknown;
        detail?: unknown;
        message?: unknown;
      };
      const parts: string[] = [];
      if (typeof j?.error === 'string') parts.push(j.error);
      else if (j?.error != null) parts.push(JSON.stringify(j.error));
      if (typeof j?.detail === 'string' && j.detail && !parts.some((p) => p.includes(j.detail as string))) {
        parts.push(j.detail);
      }
      if (typeof j?.message === 'string' && j.message && !parts.includes(j.message)) parts.push(j.message);
      if (parts.length > 0) return `${status}: ${parts.join(' — ')}`;
    } catch {
      try {
        const text = await res.clone().text();
        if (text?.trim()) return `${status}: ${text.trim().slice(0, 400)}`;
      } catch {
        /* ignore */
      }
    }
    if (status === 404) {
      return '404: Edge Function "ai-assist" not found. Deploy: `supabase functions deploy ai-assist` to the same project as EXPO_PUBLIC_SUPABASE_URL.';
    }
    if (status === 401) {
      return '401: Session invalid or expired. Sign out and sign in again.';
    }
    if (status === 500) {
      return '500: Edge Function error. In Dashboard → Edge Functions → Secrets, set OPENROUTER_API_KEY (same project as your app URL).';
    }
    if (status === 502) {
      return '502: OpenRouter rejected the request — bad key, model, or quota. Set OPENROUTER_MODEL to a model your key can use, or check logs/Dashboard.';
    }
    return `${status}: Edge Function returned an error.`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function invokeAiAssist<T = unknown>(
  action: AiAction,
  payload: Record<string, unknown>
): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await supabase.functions.invoke<{ result: T }>('ai-assist', {
    body: { action, payload },
  });
  if (error) {
    const detail = await formatFunctionsInvokeError(error);
    throw new Error(detail);
  }
  if (data == null || typeof data !== 'object' || !('result' in data)) {
    throw new Error(
      'Edge Function returned an unexpected body (missing { result }). Redeploy `ai-assist` or check Dashboard logs.'
    );
  }
  return (data as { result: T }).result;
}

export async function generateLinkedinPost(input: {
  topic: string;
  tone: string;
  platform: string;
  stack?: string[];
  templateId?: LinkedinTemplateId;
}) {
  return invokeAiAssist('linkedin_post', PROMPT_PAYLOAD_HELPERS.linkedinPost(input));
}

export async function generateDailyMissionsAi(input: {
  role: string;
  experienceLevel: string;
  stack: string[];
  goals: string;
  minutes: number;
  templateId?: MissionTemplateId;
}) {
  return invokeAiAssist<{ missions: unknown[] }>(
    'daily_missions',
    PROMPT_PAYLOAD_HELPERS.dailyMissions(input)
  );
}

export async function generateQuizQuestionAi(input: {
  topic: string;
  difficulty: string;
  templateId?: QuizTemplateId;
}) {
  return invokeAiAssist<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    difficulty: string;
  }>('quiz_question', PROMPT_PAYLOAD_HELPERS.quizQuestion(input));
}

export type QuizBatchQuestion = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
};

export async function generateQuizBatchAi(input: {
  topic: string;
  difficulty: string;
  count: number;
  templateId?: QuizTemplateId;
}) {
  const res = await invokeAiAssist<{ questions: QuizBatchQuestion[] }>(
    'quiz_batch',
    PROMPT_PAYLOAD_HELPERS.quizBatch(input)
  );
  return Array.isArray(res.questions) ? res.questions : [];
}

export type ExploreFeedItem = {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  url: string | null;
};

export async function generateExploreFeedAi(input: {
  query: string;
  templateId?: ExploreTemplateId;
  profileHint?: string;
}) {
  const res = await invokeAiAssist<{ items: ExploreFeedItem[] }>(
    'explore_feed',
    PROMPT_PAYLOAD_HELPERS.exploreFeed(input)
  );
  return Array.isArray(res.items) ? res.items : [];
}
