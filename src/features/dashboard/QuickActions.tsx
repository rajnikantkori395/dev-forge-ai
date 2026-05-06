import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

const actions: {
  href: Href;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  hint: string;
}[] = [
  { href: '/ai-generator', label: 'AI Dev Tip', icon: 'sparkles', hint: 'LinkedIn' },
  { href: '/quiz', label: 'Quiz sprint', icon: 'flash', hint: 'Timed XP' },
  { href: '/missions', label: 'Missions', icon: 'flag', hint: 'Daily' },
];

export function QuickActions() {
  return (
    <View className="flex-row flex-wrap gap-3">
      {actions.map((a) => (
        <Link key={a.label} href={a.href} asChild>
          <Pressable className="min-w-[31%] flex-1 rounded-2xl border border-forge-border bg-forge-elevated/80 p-3 active:opacity-80">
            <Ionicons name={a.icon} size={22} color="#58a6ff" />
            <Text className="mt-2 font-semibold text-white">{a.label}</Text>
            <Text className="text-xs text-forge-muted">{a.hint}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
