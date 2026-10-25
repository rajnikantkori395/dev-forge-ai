import { QUIZ_TEMPLATE_IDS, type QuizTemplateId } from '@/lib/prompts/templates';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  generateQuizBatchAi,
  generateQuizQuestionAi,
  type QuizBatchQuestion,
} from '@/services/ai';
import type { Difficulty, QuizRow, QuizTopic } from '@/types';

/** Rotate quiz “voice” by topic string for variety */
export function quizTemplateForTopic(topic: string): QuizTemplateId {
  let h = 0;
  for (let i = 0; i < topic.length; i++) h = (h << 5) - h + topic.charCodeAt(i);
  return QUIZ_TEMPLATE_IDS[Math.abs(h) % QUIZ_TEMPLATE_IDS.length]!;
}

export async function fetchQuizzesForTopic(topic: QuizTopic, limit = 12): Promise<QuizRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .ilike('topic', `%${topic}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as QuizRow[]).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
  }));
}

export async function fetchRandomQuizzes(limit = 8): Promise<QuizRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('quizzes').select('*').limit(40);
  if (error) throw error;
  const rows = (data ?? []) as QuizRow[];
  const mapped = rows.map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
  }));
  return mapped.sort(() => Math.random() - 0.5).slice(0, limit);
}

function normalizeQuestion(q: QuizBatchQuestion, topic: QuizTopic, fallbackDiff: Difficulty) {
  const opts = Array.isArray(q.options) ? q.options.filter(Boolean).slice(0, 4) : [];
  if (opts.length < 2) return null;
  const correct = Math.min(Math.max(0, Number(q.correct_answer) || 0), opts.length - 1);
  return {
    question: String(q.question).slice(0, 2000),
    options: opts,
    correct_answer: correct,
    difficulty: (q.difficulty as Difficulty) || fallbackDiff,
    topic,
    explanation: (q.explanation ?? '').slice(0, 4000),
  };
}

/**
 * Generate N questions via AI and insert into `quizzes` (live bank).
 */
export async function generateAndPersistQuizBatch(args: {
  topic: QuizTopic;
  difficulty: Difficulty;
  count?: number;
  templateId?: QuizTemplateId;
}): Promise<QuizRow[]> {
  const count = args.count ?? 5;
  const templateId = args.templateId ?? quizTemplateForTopic(args.topic);
  const questions = await generateQuizBatchAi({
    topic: args.topic,
    difficulty: args.difficulty,
    count,
    templateId,
  });
  const rows = questions
    .map((q) => normalizeQuestion(q, args.topic, args.difficulty))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length === 0 || !isSupabaseConfigured) return [];

  const { data, error } = await supabase.from('quizzes').insert(rows).select('*');
  if (error) throw error;
  return ((data ?? []) as QuizRow[]).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
  }));
}

export async function createAiQuiz(
  topic: QuizTopic,
  difficulty: Difficulty,
  templateId?: QuizTemplateId
): Promise<QuizRow | null> {
  const tid = templateId ?? quizTemplateForTopic(topic);
  try {
    const q = await generateQuizQuestionAi({ topic, difficulty, templateId: tid });
    if (!q?.question || !Array.isArray(q.options) || q.options.length < 2) return null;
    const normalized = normalizeQuestion(q, topic, difficulty);
    if (!normalized) return null;
    if (!isSupabaseConfigured) {
      return {
        id: `temp-${Date.now()}`,
        question: normalized.question,
        options: normalized.options,
        correct_answer: normalized.correct_answer,
        difficulty: normalized.difficulty,
        topic,
        explanation: normalized.explanation,
        created_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase.from('quizzes').insert(normalized).select('*').single();
    if (error) throw error;
    const row = data as QuizRow;
    return {
      ...row,
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
    };
  } catch {
    return null;
  }
}
