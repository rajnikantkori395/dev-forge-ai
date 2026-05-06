import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { MissionCard } from '@/components/missions/MissionCard';
import { Screen } from '@/components/ui/Screen';
import { isSupabaseConfigured } from '@/lib/supabase';
import { completeMission, ensureTodaysMissions, fetchTodaysMissions, fetchUserMissions } from '@/services/missions';
import { fetchProfile } from '@/services/profile';
import { useAuthStore } from '@/store/auth-store';
import type { DailyMission } from '@/types';

export default function MissionsScreen() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
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

  const completeMut = useMutation({
    mutationFn: (m: DailyMission) => completeMission(user!.id, m),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-missions'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const doneIds = new Set(
    (userMissionsQuery.data ?? []).filter((um) => um.completed).map((um) => um.mission_id)
  );

  const onRefresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['missions'] });
    void qc.invalidateQueries({ queryKey: ['user-missions'] });
    void qc.invalidateQueries({ queryKey: ['profile'] });
  }, [qc]);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          tintColor="#58a6ff"
          refreshing={missionsQuery.isRefetching}
          onRefresh={onRefresh}
        />
      }>
      <View className="pb-3 pt-2">
        <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">Daily missions</Text>
        <Text className="mt-1 text-2xl font-bold text-white">Ship the loop</Text>
        <Text className="mt-1 text-sm text-forge-muted">Complete six curated missions — XP stacks instantly.</Text>
      </View>

      {(missionsQuery.data ?? []).map((m) => (
        <MissionCard
          key={m.id}
          mission={m}
          done={doneIds.has(m.id)}
          busy={completeMut.isPending}
          onComplete={() => completeMut.mutate(m)}
        />
      ))}
    </Screen>
  );
}
