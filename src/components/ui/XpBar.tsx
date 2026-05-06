import { Text, View } from 'react-native';
import { levelProgress, xpForNextLevel } from '@/utils/level';

export function XpBar({ xp, level }: { xp: number; level: number }) {
  const pct = levelProgress(xp, level);
  const next = xpForNextLevel(level);
  return (
    <View className="mt-2">
      <View className="h-2 w-full overflow-hidden rounded-full bg-forge-border">
        <View className="h-full rounded-full bg-forge-accent" style={{ width: `${pct * 100}%` }} />
      </View>
      <Text className="mt-1 text-xs text-forge-muted">
        {xp} XP · next checkpoint {next} XP
      </Text>
    </View>
  );
}
