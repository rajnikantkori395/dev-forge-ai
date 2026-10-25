import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ExploreTemplateId } from '@/lib/prompts/templates';
import { generateExploreFeedAi, type ExploreFeedItem } from '@/services/ai';
import type { ExploreTopic } from '@/types';

export async function fetchExplorePage(from = 0, pageSize = 12): Promise<ExploreTopic[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('explore_topics')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []) as ExploreTopic[];
}

function mapDifficulty(d: string | undefined): string {
  const x = (d ?? 'intermediate').toLowerCase();
  if (['beginner', 'easy', 'junior'].includes(x)) return 'beginner';
  if (['advanced', 'hard', 'expert'].includes(x)) return 'advanced';
  return 'intermediate';
}

/** Insert AI rows; ignores empty input. */
export async function persistExploreItems(items: ExploreFeedItem[]): Promise<ExploreTopic[]> {
  if (!isSupabaseConfigured || items.length === 0) return [];
  const rows = items
    .filter((i) => i.title?.trim())
    .map((i) => ({
      title: i.title.trim().slice(0, 500),
      description: (i.description ?? '').trim().slice(0, 4000) || null,
      category: (i.category ?? 'Engineering').slice(0, 120),
      difficulty: mapDifficulty(i.difficulty),
      url: i.url && /^https?:\/\//i.test(i.url) ? i.url : null,
    }));
  if (rows.length === 0) return [];

  const { data, error } = await supabase.from('explore_topics').insert(rows).select('*');
  if (error) throw error;
  return (data ?? []) as ExploreTopic[];
}

/**
 * Live AI search → persist to `explore_topics` → return freshly inserted rows (newest first).
 */
export async function searchExploreAndPersist(args: {
  query: string;
  templateId: ExploreTemplateId;
  profileHint?: string;
}): Promise<ExploreTopic[]> {
  const items = await generateExploreFeedAi({
    query: args.query,
    templateId: args.templateId,
    profileHint: args.profileHint,
  });
  return persistExploreItems(items);
}
