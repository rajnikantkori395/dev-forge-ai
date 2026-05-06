import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const BADGES = [
  'backend_explorer',
  'react_warrior',
  'aws_explorer',
  'system_design_learner',
  'dev_tip_creator',
] as const;

export type BadgeId = (typeof BADGES)[number];

export async function unlockBadge(userId: string, badgeId: BadgeId) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('user_badges').upsert(
    { user_id: userId, badge_id: badgeId },
    { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

export async function fetchBadges(userId: string) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('user_badges').select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}
