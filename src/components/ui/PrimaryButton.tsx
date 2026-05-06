import { ActivityIndicator, Pressable, Text } from 'react-native';

export function PrimaryButton({
  label,
  onPress,
  loading,
  variant = 'accent',
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'accent' | 'ghost';
  disabled?: boolean;
}) {
  const base =
    variant === 'accent'
      ? 'bg-forge-accent active:opacity-90'
      : 'border border-forge-border bg-forge-elevated active:opacity-80';
  const dim = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={dim}
      className={`flex-row items-center justify-center rounded-xl px-4 py-3 ${base} ${dim ? 'opacity-45' : ''}`}>
      {loading ? (
        <ActivityIndicator color={variant === 'accent' ? '#070a0f' : '#58a6ff'} />
      ) : (
        <Text
          className={`font-semibold ${variant === 'accent' ? 'text-forge-bg' : 'text-forge-accent'}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
