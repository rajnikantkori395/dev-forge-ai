import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { StatPill } from '@/components/ui/StatPill';
import { XpBar } from '@/components/ui/XpBar';
import { QuickActions } from '@/features/dashboard/QuickActions';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ensureTodaysMissions, fetchTodaysMissions, fetchUserMissions } from '@/services/missions';
import { fetchProfile, syncStreak } from '@/services/profile';
import { useAuthStore } from '@/store/auth-store';

export default function ForgeHome() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const p = await fetchProfile(user!.id);
      if (!p) return null;
      return syncStreak(user!.id, p);
    },
    enabled: !!user?.id && isSupabaseConfigured,
  });

  const missionsQuery = useQuery({
    queryKey: ['missions', user?.id],
    queryFn: async () => {
      await ensureTodaysMissions(profileQuery.data ?? null);
      return fetchTodaysMissions();
    },
    enabled: !!user?.id && isSupabaseConfigured && !!profileQuery.data?.onboarding_completed,
  });

  const userMissionsQuery = useQuery({
    queryKey: ['user-missions', user?.id],
    queryFn: () => fetchUserMissions(user!.id),
    enabled: !!user?.id && isSupabaseConfigured,
  });

  const onRefresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['profile'] });
    void qc.invalidateQueries({ queryKey: ['missions'] });
    void qc.invalidateQueries({ queryKey: ['user-missions'] });
  }, [qc]);

  const profile = profileQuery.data;
  const missions = missionsQuery.data ?? [];
  const doneIds = new Set(
    (userMissionsQuery.data ?? []).filter((um) => um.completed).map((um) => um.mission_id)
  );

  const explore = missions.find((m) => m.type === 'explore');

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          tintColor="#58a6ff"
          refreshing={missionsQuery.isRefetching || profileQuery.isRefetching}
          onRefresh={onRefresh}
        />
      }>

      <View className="flex-row flex-wrap items-end justify-between pb-4 pt-2">
        <View>
          <Text className="font-mono text-xs uppercase tracking-[0.35em] text-forge-muted">DevForge AI</Text>
          <Text className="mt-1 text-2xl font-bold text-white">Today&apos;s forge</Text>
        </View>
        <Link href="/profile" asChild>
          <Pressable hitSlop={8}>
            <Text className="font-mono text-xs text-forge-accent">Profile →</Text>
          </Pressable>
        </Link>
      </View>

      <GlassCard className="mb-4">
        <View className="flex-row gap-3">
          <StatPill label="Streak" value={profile?.streak ?? 0} tone="mint" />
          <StatPill label="Level" value={profile?.level ?? 1} tone="violet" />
          <StatPill label="XP" value={profile?.xp ?? 0} />
        </View>
        <XpBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
      </GlassCard>

      {explore ? (
        <GlassCard className="mb-4 border-forge-violet/30">
          <Text className="font-mono text-xs uppercase text-forge-violet">Explore signal</Text>
          <Text className="mt-1 text-lg font-semibold text-white">{explore.title}</Text>
          <Text className="mt-1 text-sm text-forge-muted">{explore.description}</Text>
        </GlassCard>
      ) : null}

      <Text className="mb-2 font-mono text-xs uppercase tracking-wide text-forge-muted">Quick actions</Text>
      <QuickActions />

      <Text className="mb-2 mt-6 font-mono text-xs uppercase tracking-wide text-forge-muted">Daily missions</Text>
      {missions.slice(0, 3).map((m) => (
        <View key={m.id} className="mb-2 rounded-2xl border border-forge-border bg-forge-surface/80 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 pr-2 font-semibold text-white">{m.title}</Text>
            <Text className="font-mono text-xs text-forge-mint">+{m.xp_reward}</Text>
          </View>
          <Text className="mt-1 text-xs text-forge-muted">{doneIds.has(m.id) ? 'Done' : 'Open missions tab to complete'}</Text>
        </View>
      ))}

      <Link href="/missions" asChild>
        <Pressable className="mt-2 self-center py-2">
          <Text className="font-mono text-sm text-forge-accent">View all missions</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
