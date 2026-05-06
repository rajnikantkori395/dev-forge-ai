import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

const ROLES = ['Frontend', 'Backend', 'Full-stack', 'DevOps', 'Mobile', 'Other'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [role, setRole] = useState<string>(ROLES[2]);
  const [experience, setExperience] = useState('Mid');
  const [stack, setStack] = useState('TypeScript, React, Node');
  const [goals, setGoals] = useState('Senior scope, system design depth, public writing');
  const [minutes, setMinutes] = useState('25');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!user?.id) {
      Alert.alert('Auth', 'Sign in first, then return to onboarding.');
      router.replace('/(auth)/login');
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase', 'Configure Supabase keys to persist preferences.');
      return;
    }
    setLoading(true);
    const preferred_stack = stack
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        experience_level: experience,
        preferred_stack,
        goals,
        daily_minutes: Number(minutes) || 20,
        onboarding_completed: true,
      })
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      Alert.alert('Onboarding', error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ['profile'] });
    router.replace('/(app)/(tabs)');
  }

  return (
    <Screen scroll>
      <View className="pb-4 pt-4">
        <Text className="font-mono text-xs uppercase tracking-[0.25em] text-forge-violet">Calibration</Text>
        <Text className="mt-2 text-2xl font-bold text-white">Shape your forge</Text>
        <Text className="mt-1 text-sm text-forge-muted">
          We tune missions, quizzes, and AI posts to your stack and cadence.
        </Text>
      </View>

      <GlassCard>
        <Text className="mb-2 text-xs uppercase text-forge-muted">Role</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {ROLES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              className={`rounded-full border px-3 py-2 active:opacity-80 ${
                role === r
                  ? 'border-forge-accent bg-forge-accent/20'
                  : 'border-forge-border bg-forge-elevated/60'
              }`}>
              <Text
                className={`font-mono text-xs ${role === r ? 'text-forge-accent' : 'text-forge-muted'}`}>
                {r}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextField label="Experience" value={experience} onChangeText={setExperience} placeholder="Junior / Mid / Senior" />
        <TextField label="Preferred stack (comma separated)" value={stack} onChangeText={setStack} />
        <View className="mb-3">
          <Text className="mb-1 text-xs uppercase tracking-wide text-forge-muted">Goals</Text>
          <TextInput
            multiline
            numberOfLines={3}
            value={goals}
            onChangeText={setGoals}
            placeholderTextColor="#6e7681"
            className="min-h-[88px] rounded-xl border border-forge-border bg-forge-elevated px-3 py-3 font-mono text-sm text-white"
          />
        </View>
        <TextField label="Daily learning minutes" value={minutes} onChangeText={setMinutes} />

        <PrimaryButton label="Save & enter forge" onPress={save} loading={loading} />
      </GlassCard>
    </Screen>
  );
}
