import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import type { QuizTopic } from '@/types';
import { QUIZ_TOPICS } from '@/types';

export default function QuizHubScreen() {
  const router = useRouter();

  function openTopic(topic: QuizTopic) {
    router.push({
      pathname: '/play/[topic]',
      params: { topic },
    });
  }

  return (
    <Screen scroll>
      <View className="pb-3 pt-2">
        <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">Quiz engine</Text>
        <Text className="mt-1 text-2xl font-bold text-white">Sprint mode</Text>
        <Text className="mt-1 text-sm text-forge-muted">Timed multiple choice, swipe-style flow, XP on correct.</Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {QUIZ_TOPICS.map((topic) => (
          <Pressable
            key={topic}
            onPress={() => openTopic(topic)}
            className="mb-0 min-w-[47%] flex-1"
            accessibilityRole="button"
            accessibilityLabel={`Start quiz for ${topic}`}>
            <GlassCard>
              <Text className="font-mono text-[10px] uppercase text-forge-accent">{topic}</Text>
              <Text className="mt-2 text-base font-semibold text-white">Start run</Text>
              <Text className="mt-1 text-xs text-forge-muted">Banked + AI questions</Text>
            </GlassCard>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
