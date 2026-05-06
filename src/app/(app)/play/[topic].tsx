import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { isSupabaseConfigured } from '@/lib/supabase';
import { awardXp } from '@/services/profile';
import { createAiQuiz, fetchQuizzesForTopic } from '@/services/quiz';
import { useAuthStore } from '@/store/auth-store';
import type { Difficulty, QuizRow, QuizTopic } from '@/types';

const TIMED_SECONDS = 20;

export default function QuizPlayScreen() {
  const { topic: raw } = useLocalSearchParams<{ topic?: string | string[] }>();
  const rawTopic = Array.isArray(raw) ? raw[0] : raw;
  const topic = decodeURIComponent(rawTopic ?? '') as QuizTopic;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [pool, setPool] = useState<QuizRow[]>([]);
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timed, setTimed] = useState(true);
  const [seconds, setSeconds] = useState(TIMED_SECONDS);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const base = await fetchQuizzesForTopic(topic, 8);
      const extra = await createAiQuiz(topic, difficulty);
      const merged = extra ? [extra, ...base] : base;
      if (!alive) return;
      setPool(merged.length ? merged : base);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [topic, difficulty]);

  const current = pool[index];

  useEffect(() => {
    if (!timed || !current || feedback) return;
    setSeconds(TIMED_SECONDS);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setFeedback('Time — review the explanation and continue.');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [index, timed, current, feedback]);

  const answer = useCallback(
    async (choice: number) => {
      if (!current || feedback) return;
      const ok = choice === current.correct_answer;
      setFeedback(ok ? 'Correct · +40 XP' : `Miss — ${current.explanation ?? 'Keep drilling this topic.'}`);
      if (ok && user?.id && isSupabaseConfigured) {
        await awardXp(user.id, 40);
        setScore((s) => s + 1);
      }
    },
    [current, feedback, user?.id]
  );

  const next = () => {
    setFeedback(null);
    setIndex((i) => (i + 1 < pool.length ? i + 1 : 0));
  };

  if (loading || !current) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-forge-muted">Loading questions…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between pb-3 pt-2">
        <Text className="font-mono text-xs uppercase text-forge-muted">{topic}</Text>
        <Text className="font-mono text-xs text-forge-mint">Score {score}</Text>
      </View>

      <View className="mb-3 flex-row flex-wrap gap-2">
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => setDifficulty(d)}
            className={`rounded-full border px-3 py-2 ${difficulty === d ? 'border-forge-accent' : 'border-forge-border'}`}>
            <Text className={`font-mono text-xs capitalize ${difficulty === d ? 'text-forge-accent' : 'text-forge-muted'}`}>
              {d}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setTimed((t) => !t)}
          className="rounded-full border border-forge-border px-3 py-2">
          <Text className="font-mono text-xs text-white">{timed ? `⏱ ${seconds}s` : 'Untimed'}</Text>
        </Pressable>
      </View>

      <GlassCard>
        <Text className="font-mono text-xs uppercase text-forge-violet">{current.difficulty}</Text>
        <Text className="mt-3 text-lg font-semibold leading-6 text-white">{current.question}</Text>
      </GlassCard>

      <Text className="my-2 text-center text-xs text-forge-muted">
        Tap an answer — swipe-style deck coming next (gesture layer ready).
      </Text>

      <View className="gap-2">
        {current.options.map((opt, i) => (
          <Pressable
            key={opt}
            onPress={() => void answer(i)}
            className="rounded-xl border border-forge-border bg-forge-elevated/90 px-4 py-3 active:border-forge-accent">
            <Text className="font-mono text-sm text-white">
              {String.fromCharCode(65 + i)}. {opt}
            </Text>
          </Pressable>
        ))}
      </View>

      {feedback ? (
        <GlassCard className="mt-4 border-forge-mint/30">
          <Text className="text-sm text-forge-muted">{feedback}</Text>
          <View className="mt-3 flex-row gap-2">
            <PrimaryButton label="Next card" onPress={next} />
            <PrimaryButton label="Exit" onPress={() => router.back()} variant="ghost" />
          </View>
        </GlassCard>
      ) : null}
    </Screen>
  );
}
