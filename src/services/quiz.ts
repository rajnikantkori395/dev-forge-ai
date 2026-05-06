import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { generateQuizQuestionAi } from '@/services/ai';
import type { Difficulty, QuizRow, QuizTopic } from '@/types';

export async function fetchQuizzesForTopic(topic: QuizTopic, limit = 12): Promise<QuizRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .ilike('topic', `%${topic}%`)
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

export async function createAiQuiz(topic: QuizTopic, difficulty: Difficulty): Promise<QuizRow | null> {
  try {
    const q = await generateQuizQuestionAi({ topic, difficulty });
    if (!q?.question || !Array.isArray(q.options) || q.options.length < 2) return null;
    if (!isSupabaseConfigured) {
      return {
        id: `temp-${Date.now()}`,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        difficulty: (q.difficulty as Difficulty) ?? difficulty,
        topic,
        explanation: q.explanation ?? '',
        created_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty ?? difficulty,
        topic,
        explanation: q.explanation ?? '',
      })
      .select('*')
      .single();
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
