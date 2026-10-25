import { MISSION_TEMPLATE_IDS, type MissionTemplateId } from '@/lib/prompts/templates';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { generateDailyMissionsAi } from '@/services/ai';
import type { DailyMission, Profile, UserMission } from '@/types';
import { buildFallbackMissions } from '@/utils/missions-fallback';

const today = () => new Date().toISOString().slice(0, 10);

function missionTemplateForUser(userId: string): MissionTemplateId {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h << 5) - h + userId.charCodeAt(i);
  return MISSION_TEMPLATE_IDS[Math.abs(h) % MISSION_TEMPLATE_IDS.length]!;
}

export async function fetchTodaysMissions(): Promise<DailyMission[]> {
  if (!isSupabaseConfigured) return [];
  const d = today();
  const { data, error } = await supabase
    .from('daily_missions')
    .select('*')
    .eq('mission_date', d)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyMission[];
}

type MissionInsert = Pick<
  DailyMission,
  'title' | 'description' | 'type' | 'difficulty' | 'xp_reward' | 'mission_date' | 'payload'
>;

export async function insertMissionTemplates(rows: MissionInsert[]) {
  if (!isSupabaseConfigured || rows.length === 0) return;
  const { error } = await supabase.from('daily_missions').insert(rows);
  if (error) throw error;
}

export async function ensureTodaysMissions(profile: Profile | null): Promise<DailyMission[]> {
  const existing = await fetchTodaysMissions();
  if (existing.length >= 6) return existing;
  if (!profile?.onboarding_completed) return existing;

  const mission_date = today();
  try {
    const ai = await generateDailyMissionsAi({
      role: profile.role ?? 'Software engineer',
      experienceLevel: profile.experience_level ?? 'Mid',
      stack: profile.preferred_stack ?? ['TypeScript', 'React'],
      goals: profile.goals ?? 'Grow as a full-stack engineer',
      minutes: profile.daily_minutes ?? 20,
      templateId: missionTemplateForUser(profile.id),
    });
    const missions = (ai.missions ?? []) as {
      title: string;
      description: string;
      type: DailyMission['type'];
      difficulty: DailyMission['difficulty'];
      xp_reward: number;
      payload?: Record<string, unknown>;
    }[];
    if (missions.length > 0) {
      const rows: MissionInsert[] = missions.map((m) => ({
        title: m.title,
        description: m.description,
        type: m.type,
        difficulty: m.difficulty,
        xp_reward: m.xp_reward,
        mission_date,
        payload: m.payload ?? {},
      }));
      await insertMissionTemplates(rows);
    }
  } catch {
    // fall through to local templates
  }

  const after = await fetchTodaysMissions();
  if (after.length >= 6) return after;

  const fallback: MissionInsert[] = buildFallbackMissions().map((m) => ({
    title: m.title,
    description: m.description,
    type: m.type,
    difficulty: m.difficulty,
    xp_reward: m.xp_reward,
    mission_date,
    payload: m.payload ?? {},
  }));

  await insertMissionTemplates(fallback);
  return fetchTodaysMissions();
}

export async function fetchUserMissions(userId: string): Promise<UserMission[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('user_missions')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as UserMission[];
}

export async function completeMission(userId: string, mission: DailyMission) {
  if (!isSupabaseConfigured) return;
  const { error: upsertError } = await supabase.from('user_missions').upsert(
    {
      user_id: userId,
      mission_id: mission.id,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mission_id' }
  );
  if (upsertError) throw upsertError;
  await supabase.rpc('award_xp', { p_user: userId, p_delta: mission.xp_reward });
}
