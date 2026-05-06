import { FunctionsHttpError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { PROMPT_PAYLOAD_HELPERS } from '@/lib/prompts/templates';

export type AiAction = 'linkedin_post' | 'daily_missions' | 'quiz_question' | 'interview_snippet';

export async function formatFunctionsInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const status = res.status;
    try {
      const j = (await res.clone().json()) as { error?: unknown; detail?: unknown };
      if (typeof j?.error === 'string') return `${status}: ${j.error}`;
      if (j?.error != null) return `${status}: ${JSON.stringify(j.error)}`;
      if (typeof j?.detail === 'string') return `${status}: ${j.detail}`;
    } catch {
      /* fall through */
    }
    if (status === 404) {
      return '404: Edge Function "ai-assist" not found. Deploy it: `supabase functions deploy ai-assist` and set secrets.';
    }
    if (status === 401) {
      return '401: Session invalid or expired. Sign out and sign in again.';
    }
    if (status === 500) {
      return '500: Function error — set OPENROUTER_API_KEY in Supabase → Edge Functions → ai-assist → Secrets.';
    }
    if (status === 502) {
      return '502: OpenRouter rejected the request (model id, quota, or API key). Check function logs.';
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
  if (!data?.result) throw new Error('Empty AI response from Edge Function');
  return data.result;
}

export async function generateLinkedinPost(input: {
  topic: string;
  tone: string;
  platform: string;
  stack?: string[];
}) {
  return invokeAiAssist('linkedin_post', PROMPT_PAYLOAD_HELPERS.linkedinPost(input));
}

export async function generateDailyMissionsAi(input: {
  role: string;
  experienceLevel: string;
  stack: string[];
  goals: string;
  minutes: number;
}) {
  return invokeAiAssist<{ missions: unknown[] }>(
    'daily_missions',
    PROMPT_PAYLOAD_HELPERS.dailyMissions(input)
  );
}

export async function generateQuizQuestionAi(input: { topic: string; difficulty: string }) {
  return invokeAiAssist<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    difficulty: string;
  }>('quiz_question', PROMPT_PAYLOAD_HELPERS.quizQuestion(input));
}
