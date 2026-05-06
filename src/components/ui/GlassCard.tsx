import { PropsWithChildren } from 'react';
import { View } from 'react-native';

export function GlassCard({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View
      className={`rounded-2xl border border-forge-border bg-forge-surface/80 p-4 shadow-lg shadow-black/40 ${className}`}>
      {children}
    </View>
  );
}
