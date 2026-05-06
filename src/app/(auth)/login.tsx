import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file (see .env.example).'
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in', error.message);
      return;
    }
    router.replace('/(app)/(tabs)');
  }

  return (
    <Screen scroll>
      <View className="pb-8 pt-4">
        <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-accent">
          DevForge AI
        </Text>
        <Text className="mt-2 text-3xl font-bold text-white">Welcome back</Text>
        <Text className="mt-1 text-sm text-forge-muted">Duolingo energy · GitHub discipline · AI mentor</Text>
      </View>

      <GlassCard>
        <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@company.com" />
        <TextField label="Password" value={password} onChangeText={setPassword} secure placeholder="••••••••" />
        <PrimaryButton label="Sign in" onPress={onLogin} loading={loading} />
        <Link href="/(auth)/register" asChild>
          <Pressable className="mt-4 py-2">
            <Text className="text-center text-sm text-forge-accent">Create an account</Text>
          </Pressable>
        </Link>
      </GlassCard>
    </Screen>
  );
}
