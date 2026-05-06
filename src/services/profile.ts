import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'name'
      | 'preferred_stack'
      | 'goals'
      | 'daily_minutes'
      | 'role'
      | 'experience_level'
      | 'onboarding_completed'
    >
  >
) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function awardXp(userId: string, delta: number) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('award_xp', { p_user: userId, p_delta: delta });
  if (error) throw error;
}

function yesterdayIso(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - 1);
  return x.toISOString().slice(0, 10);
}

export async function syncStreak(userId: string, profile: Profile): Promise<Profile> {
  if (!isSupabaseConfigured) return profile;
  const today = new Date().toISOString().slice(0, 10);
  if (profile.last_active_date === today) return profile;

  let nextStreak = 1;
  if (profile.last_active_date === yesterdayIso(new Date())) {
    nextStreak = (profile.streak ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ last_active_date: today, streak: nextStreak })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}
