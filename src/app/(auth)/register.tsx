import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase', 'Configure environment variables first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up', error.message);
      return;
    }
    Alert.alert('Check your inbox', 'Confirm email if required, then sign in.');
    router.replace('/(auth)/login');
  }

  return (
    <Screen scroll>
      <View className="pb-6 pt-4">
        <Text className="text-3xl font-bold text-white">Create forge</Text>
        <Text className="mt-1 text-sm text-forge-muted">Build streaks, ship learning loops, own your growth.</Text>
      </View>
      <GlassCard>
        <TextField label="Display name" value={name} onChangeText={setName} placeholder="Ada Lovelace" />
        <TextField label="Email" value={email} onChangeText={setEmail} />
        <TextField label="Password" value={password} onChangeText={setPassword} secure />
        <PrimaryButton label="Sign up" onPress={onRegister} loading={loading} />
        <Link href="/(auth)/login" asChild>
          <Pressable className="mt-4 py-2">
            <Text className="text-center text-sm text-forge-accent">Already have an account?</Text>
          </Pressable>
        </Link>
      </GlassCard>
    </Screen>
  );
}
