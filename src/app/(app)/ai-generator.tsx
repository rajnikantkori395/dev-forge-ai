import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { unlockBadge } from '@/services/badges';
import { createLinkedinDraft } from '@/services/posts';
import { useAuthStore } from '@/store/auth-store';
import type { LinkedInPostContent } from '@/types';

const TONES = ['Senior engineer', 'Staff / principal', 'Friendly mentor', 'Blunt and concise'] as const;

export default function AiGeneratorScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [topic, setTopic] = useState('Redis caching at scale');
  const [tone, setTone] = useState<(typeof TONES)[number]>(TONES[0]);
  const [platform, setPlatform] = useState('LinkedIn');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<LinkedInPostContent | null>(null);

  async function generate() {
    if (!user?.id) {
      Alert.alert('Auth', 'Sign in to generate.');
      return;
    }
    setLoading(true);
    try {
      const { post, usedFallback, fallbackReason } = await createLinkedinDraft({
        userId: user.id,
        topic,
        tone,
        platform,
      });
      const content = (post.content ?? {}) as LinkedInPostContent;
      setDraft(content);
      try {
        await unlockBadge(user.id, 'dev_tip_creator');
      } catch (badgeErr) {
        if (__DEV__) console.warn('[ai-generator] unlockBadge:', badgeErr);
      }
      if (usedFallback) {
        Alert.alert(
          'Offline draft',
          `Saved a template post locally. To use real AI, deploy the \`ai-assist\` Edge Function and set OPENROUTER_API_KEY in Supabase.\n\n${fallbackReason ?? ''}`.trim()
        );
      }
    } catch (e) {
      Alert.alert(
        'Could not finish',
        e instanceof Error ? e.message : 'Generation failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#070a0f' }}
      className="px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">AI Dev Tip</Text>
      <Text className="mt-1 text-2xl font-bold text-white">LinkedIn forge</Text>
      <Text className="mt-1 text-sm text-forge-muted">Structured hook, explanation, CTA, hashtags — OpenRouter models.</Text>

      <GlassCard className="mt-4">
        <TextField label="Topic" value={topic} onChangeText={setTopic} />
        <TextField label="Platform" value={platform} onChangeText={setPlatform} />
        <Text className="mb-2 text-xs uppercase text-forge-muted">Tone</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {TONES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTone(t)}
              className={`rounded-full border px-3 py-2 active:opacity-80 ${
                tone === t ? 'border-forge-accent bg-forge-accent/10' : 'border-forge-border bg-forge-elevated/60'
              }`}>
              <Text className={`font-mono text-xs ${tone === t ? 'text-forge-accent' : 'text-forge-muted'}`}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton label="Generate" onPress={generate} loading={loading} />
      </GlassCard>

      {draft ? (
        <GlassCard className="mt-4 mb-10">
          <Text className="font-mono text-xs uppercase text-forge-mint">Hook</Text>
          <Text className="mt-1 text-base text-white">{draft.hook}</Text>
          <Text className="mt-4 font-mono text-xs uppercase text-forge-muted">Explanation</Text>
          <Text className="mt-1 text-sm leading-6 text-forge-muted">{draft.explanation}</Text>
          <Text className="mt-4 font-mono text-xs uppercase text-forge-muted">CTA</Text>
          <Text className="mt-1 text-sm text-white">{draft.cta}</Text>
          <Text className="mt-4 font-mono text-xs uppercase text-forge-violet">Hashtags</Text>
          <Text className="mt-1 text-sm text-forge-muted">{(draft.hashtags ?? []).join(' ')}</Text>
          <Text className="mt-4 font-mono text-xs uppercase text-forge-accent">Full draft</Text>
          <Text className="mt-1 text-sm leading-6 text-white">{draft.fullPost}</Text>
        </GlassCard>
      ) : null}

      <View className="h-6" />
      <PrimaryButton label="Close" onPress={() => router.back()} variant="ghost" />
      <View className="h-10" />
    </ScrollView>
  );
}
