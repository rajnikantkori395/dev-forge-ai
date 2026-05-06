import { Redirect, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchProfile } from '@/services/profile';
import { registerForPushAsync, scheduleDailyReminder } from '@/services/notifications';
import { useAuthStore } from '@/store/auth-store';

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id && isSupabaseConfigured,
  });

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || Platform.OS === 'web') return;
    void registerForPushAsync();
    void scheduleDailyReminder(9, 0);
  }, [user?.id]);

  if (user && isSupabaseConfigured && !isLoading && profile && !profile.onboarding_completed) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0d1117' },
        headerTintColor: '#f0f6fc',
        headerTitleStyle: { fontFamily: 'SpaceMono' },
        contentStyle: { backgroundColor: '#070a0f' },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="ai-generator"
        options={{ presentation: 'modal', title: 'AI Dev Tip' }}
      />
      <Stack.Screen name="play/[topic]" options={{ title: 'Quiz' }} />
    </Stack>
  );
}
