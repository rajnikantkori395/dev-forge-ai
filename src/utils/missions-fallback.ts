import type { DailyMission, Difficulty, MissionType } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);

export function buildFallbackMissions(): Omit<
  DailyMission,
  'id' | 'created_at' | 'mission_date'
>[] {
  const mission_date = today();
  const base = (
    title: string,
    description: string,
    type: MissionType,
    difficulty: Difficulty,
    xp_reward: number
  ) => ({
    title,
    description,
    type,
    difficulty,
    xp_reward,
    payload: { offline: true, mission_date },
  });

  return [
    base(
      'Ship a micro-refactor',
      'Pick one small smell in your codebase and fix it with a focused PR under 50 lines.',
      'challenge',
      'medium',
      35
    ),
    base(
      'Redis mental model',
      'Sketch how TTL, eviction policies, and single-threading affect latency in a hot path.',
      'architecture',
      'hard',
      45
    ),
    base(
      'Explain async to a junior',
      'Write a 5-bullet explanation of the JS event loop vs worker threads.',
      'dev_tip',
      'easy',
      20
    ),
    base(
      'API idempotency drill',
      'List three ways to make POST retries safe for payments or provisioning.',
      'interview',
      'medium',
      40
    ),
    base(
      'Explore Bun or Deno',
      'Skim release notes for one edge runtime and note one tradeoff vs Node.',
      'explore',
      'easy',
      25
    ),
    base(
      'Deep work block',
      'Schedule a 45m maker block, silence notifications, and ship one meaningful commit.',
      'productivity',
      'easy',
      30
    ),
  ];
}
