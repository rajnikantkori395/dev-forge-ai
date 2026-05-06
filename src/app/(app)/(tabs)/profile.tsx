import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { StatPill } from '@/components/ui/StatPill';
import { XpBar } from '@/components/ui/XpBar';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { fetchBadges } from '@/services/badges';
import { fetchProfile } from '@/services/profile';
import { fetchUserPosts } from '@/services/posts';
import { useAuthStore } from '@/store/auth-store';

const BADGE_LABEL: Record<string, string> = {
  backend_explorer: 'Backend Explorer',
  react_warrior: 'React Warrior',
  aws_explorer: 'AWS Explorer',
  system_design_learner: 'System Design Learner',
  dev_tip_creator: 'Dev Tip Creator',
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id && isSupabaseConfigured,
  });

  const badgesQuery = useQuery({
    queryKey: ['badges', user?.id],
    queryFn: () => fetchBadges(user!.id),
    enabled: !!user?.id && isSupabaseConfigured,
  });

  const postsQuery = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchUserPosts(user!.id),
    enabled: !!user?.id && isSupabaseConfigured,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  const p = profileQuery.data;

  return (
    <Screen scroll>
      <View className="pb-3 pt-2">
        <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">Profile</Text>
        <Text className="mt-1 text-2xl font-bold text-white">{p?.name ?? user?.email ?? 'Developer'}</Text>
        <Text className="mt-1 text-sm text-forge-muted">{p?.goals ?? 'Calibrate goals in onboarding.'}</Text>
      </View>

      <GlassCard className="mb-4">
        <View className="flex-row gap-3">
          <StatPill label="Streak" value={p?.streak ?? 0} tone="mint" />
          <StatPill label="Level" value={p?.level ?? 1} tone="violet" />
          <StatPill label="XP" value={p?.xp ?? 0} />
        </View>
        <XpBar xp={p?.xp ?? 0} level={p?.level ?? 1} />
      </GlassCard>

      <GlassCard className="mb-4">
        <Text className="font-mono text-xs uppercase text-forge-muted">Stack focus</Text>
        <Text className="mt-2 text-sm text-white">{(p?.preferred_stack ?? []).join(' · ') || 'Add stack in onboarding'}</Text>
      </GlassCard>

      <Text className="mb-2 font-mono text-xs uppercase text-forge-muted">Badges</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {Object.entries(BADGE_LABEL).map(([id, label]) => {
          const unlocked = (badgesQuery.data ?? []).some((b: { badge_id: string }) => b.badge_id === id);
          return (
            <View
              key={id}
              className={`rounded-xl border px-3 py-2 ${
                unlocked ? 'border-forge-mint/60 bg-forge-mint/10' : 'border-forge-border bg-forge-elevated/40'
              }`}>
              <Text className={`font-mono text-xs ${unlocked ? 'text-forge-mint' : 'text-forge-muted'}`}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mb-2 font-mono text-xs uppercase text-forge-muted">Recent generated posts</Text>
      {(postsQuery.data ?? []).slice(0, 3).map((post) => (
        <GlassCard key={post.id} className="mb-2">
          <Text className="font-mono text-xs text-forge-accent">{post.topic}</Text>
          <Text numberOfLines={3} className="mt-1 text-sm text-forge-muted">
            {(post.content as { fullPost?: string })?.fullPost ?? JSON.stringify(post.content)}
          </Text>
        </GlassCard>
      ))}

      <PrimaryButton
        label="Sign out"
        onPress={() => {
          if (!isSupabaseConfigured) {
            Alert.alert('Demo', 'Supabase not configured.');
            return;
          }
          void signOut();
        }}
        variant="ghost"
      />
    </Screen>
  );
}
