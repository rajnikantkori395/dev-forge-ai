import { Text, View } from 'react-native';

export function StatPill({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'mint' | 'violet';
}) {
  const ring =
    tone === 'mint'
      ? 'border-forge-mint/40'
      : tone === 'violet'
        ? 'border-forge-violet/40'
        : 'border-forge-border';
  return (
    <View className={`min-w-[88px] rounded-xl border ${ring} bg-forge-elevated/90 px-3 py-2`}>
      <Text className="text-xs uppercase tracking-wide text-forge-muted">{label}</Text>
      <Text className="mt-1 font-mono text-lg text-white">{value}</Text>
    </View>
  );
}
