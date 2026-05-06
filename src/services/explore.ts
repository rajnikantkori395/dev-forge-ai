import { isSupabaseConfigured, supabase } from '@/lib/supabase';
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
