import { Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { DailyMission } from '@/types';

const TYPE_LABEL: Record<DailyMission['type'], string> = {
  dev_tip: 'Dev tip',
  interview: 'Interview',
  challenge: 'Challenge',
  explore: 'Explore',
  architecture: 'Architecture',
  productivity: 'Productivity',
};

export function MissionCard({
  mission,
  done,
  onComplete,
  busy,
}: {
  mission: DailyMission;
  done: boolean;
  onComplete: () => void;
  busy?: boolean;
}) {
  return (
    <View className="mb-3 rounded-2xl border border-forge-border bg-forge-surface/90 p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="rounded-full bg-forge-elevated px-2 py-1 font-mono text-[10px] uppercase text-forge-accent">
          {TYPE_LABEL[mission.type]}
        </Text>
        <Text className="font-mono text-xs text-forge-mint">+{mission.xp_reward} XP</Text>
      </View>
      <Text className="text-base font-semibold text-white">{mission.title}</Text>
      {mission.description ? (
        <Text className="mt-1 text-sm leading-5 text-forge-muted">{mission.description}</Text>
      ) : null}
      <View className="mt-3">
        <PrimaryButton
          label={done ? 'Completed' : 'Mark done'}
          onPress={onComplete}
          loading={busy}
          variant={done ? 'ghost' : 'accent'}
          disabled={done}
        />
      </View>
    </View>
  );
}
