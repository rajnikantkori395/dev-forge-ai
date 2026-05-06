import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExplorePage } from '@/services/explore';
import type { ExploreTopic } from '@/types';

const PAGE = 10;

export default function ExploreScreen() {
  const [tab, setTab] = useState<'all' | 'architecture' | 'cloud'>('all');

  const query = useInfiniteQuery({
    queryKey: ['explore', tab],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchExplorePage(pageParam as number, PAGE),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE ? undefined : allPages.reduce((n, p) => n + p.length, 0),
  });

  const items = query.data?.pages.flat() ?? [];

  const filtered =
    tab === 'all'
      ? items
      : items.filter((i) => (i.category ?? '').toLowerCase().includes(tab));

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);

  return (
    <LinearGradient colors={['#070a0f', '#0d1117']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View className="px-4 pb-2 pt-2">
          <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">Explore</Text>
          <Text className="mt-1 text-2xl font-bold text-white">Signal feed</Text>
          <View className="mt-3 flex-row gap-2">
            {(['all', 'architecture', 'cloud'] as const).map((t) => (
              <Text
                key={t}
                onPress={() => setTab(t)}
                className={`rounded-full border px-3 py-2 font-mono text-xs capitalize ${
                  tab === t ? 'border-forge-accent text-forge-accent' : 'border-forge-border text-forge-muted'
                }`}>
                {t}
              </Text>
            ))}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color="#58a6ff" style={{ marginTop: 16 }} />
            ) : null
          }
          renderItem={({ item }) => <ExploreRow item={item} />}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function ExploreRow({ item }: { item: ExploreTopic }) {
  return (
    <GlassCard className="mb-3">
      <Text className="font-mono text-[10px] uppercase text-forge-violet">{item.category}</Text>
      <Text className="mt-1 text-lg font-semibold text-white">{item.title}</Text>
      <Text className="mt-1 text-sm leading-5 text-forge-muted">{item.description}</Text>
    </GlassCard>
  );
}
