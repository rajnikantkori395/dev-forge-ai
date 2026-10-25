import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EXPLORE_TEMPLATE_IDS,
  EXPLORE_TEMPLATE_LABELS,
  type ExploreTemplateId,
} from '@/lib/prompts/templates';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchExplorePage, searchExploreAndPersist } from '@/services/explore';
import { fetchProfile } from '@/services/profile';
import { useAuthStore } from '@/store/auth-store';
import type { ExploreTopic } from '@/types';

const PAGE = 12;
const DEFAULT_LIVE_QUERY = 'High-signal software engineering and shipping culture';

export default function ExploreScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [templateId, setTemplateId] = useState<ExploreTemplateId>('default');
  const [liveItems, setLiveItems] = useState<ExploreTopic[]>([]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id && isSupabaseConfigured,
  });

  const profileHint = useMemo(() => {
    const parts = [
      profile?.role,
      profile?.goals,
      (profile?.preferred_stack ?? []).join(', '),
    ].filter(Boolean);
    return parts.join(' · ').slice(0, 400);
  }, [profile]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 520);
    return () => clearTimeout(t);
  }, [search]);

  const dbQuery = useInfiniteQuery({
    queryKey: ['explore', 'db'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchExplorePage(pageParam as number, PAGE),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE ? undefined : allPages.reduce((n, p) => n + p.length, 0),
  });

  const genMutation = useMutation({
    mutationFn: (args: { query: string; templateId: ExploreTemplateId; profileHint: string }) =>
      searchExploreAndPersist({
        query: args.query,
        templateId: args.templateId,
        profileHint: args.profileHint,
      }),
    onSuccess: (rows) => {
      setLiveItems(rows);
      void qc.invalidateQueries({ queryKey: ['explore', 'db'] });
    },
    onError: () => setLiveItems([]),
  });

  useEffect(() => {
    if (!user?.id) setLiveItems([]);
  }, [user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    const q = debounced.length >= 2 ? debounced : DEFAULT_LIVE_QUERY;
    genMutation.mutate({ query: q, templateId, profileHint });
    // mutate is stable from useMutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, templateId, user?.id, profileHint]);

  const dbFlat = dbQuery.data?.pages.flat() ?? [];
  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: ExploreTopic[] = [];
    for (const row of [...liveItems, ...dbFlat]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
    return out;
  }, [liveItems, dbFlat]);

  const loadMore = useCallback(() => {
    if (dbQuery.hasNextPage && !dbQuery.isFetchingNextPage) void dbQuery.fetchNextPage();
  }, [dbQuery]);

  return (
    <LinearGradient colors={['#070a0f', '#0d1117']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View className="px-4 pb-2 pt-2">
          <Text className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">Explore</Text>
          <Text className="mt-1 text-2xl font-bold text-white">Live signal</Text>
          <Text className="mt-1 text-xs text-forge-muted">
            AI search → saved to your feed. Results persist in Supabase after each run.
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search (e.g. Redis, event-driven, LLM evals)…"
            placeholderTextColor="#6e7681"
            className="mt-3 rounded-xl border border-forge-border bg-forge-elevated px-3 py-3 font-mono text-sm text-white"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="mb-1 mt-3 text-[10px] uppercase tracking-wide text-forge-muted">Lens</Text>
          <View className="flex-row flex-wrap gap-2">
            {EXPLORE_TEMPLATE_IDS.map((id) => (
              <Pressable
                key={id}
                onPress={() => setTemplateId(id)}
                className={`rounded-full border px-3 py-2 ${
                  templateId === id ? 'border-forge-accent bg-forge-accent/15' : 'border-forge-border'
                }`}>
                <Text
                  className={`font-mono text-[10px] ${templateId === id ? 'text-forge-accent' : 'text-forge-muted'}`}>
                  {EXPLORE_TEMPLATE_LABELS[id]}
                </Text>
              </Pressable>
            ))}
          </View>

          {genMutation.isPending ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator color="#58a6ff" size="small" />
              <Text className="font-mono text-xs text-forge-muted">Generating & saving…</Text>
            </View>
          ) : genMutation.isError ? (
            <View className="mt-2">
              <Text className="font-mono text-xs text-amber-200/90">
                {genMutation.error instanceof Error
                  ? genMutation.error.message
                  : 'AI request failed'}
              </Text>
              <Text className="mt-1 font-mono text-[10px] leading-4 text-forge-muted">
                Showing saved topics only until this succeeds. Usual fixes: same Supabase project in `.env` as
                where you deployed `ai-assist`, signed-in session, `OPENROUTER_API_KEY` in Edge secrets,
                `supabase db push` (including explore insert policy).
              </Text>
            </View>
          ) : null}
        </View>

        <FlatList
          data={merged}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          refreshing={dbQuery.isRefetching && !genMutation.isPending}
          onRefresh={() => void dbQuery.refetch()}
          ListFooterComponent={
            dbQuery.isFetchingNextPage ? (
              <ActivityIndicator color="#58a6ff" style={{ marginTop: 16 }} />
            ) : null
          }
          renderItem={({ item }) => <ExploreRow item={item} live={liveItems.some((x) => x.id === item.id)} />}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function ExploreRow({ item, live }: { item: ExploreTopic; live: boolean }) {
  return (
    <GlassCard className="mb-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[10px] uppercase text-forge-violet">{item.category}</Text>
        {live ? (
          <Text className="rounded bg-forge-mint/20 px-2 py-0.5 font-mono text-[9px] text-forge-mint">New</Text>
        ) : null}
      </View>
      <Text className="mt-1 text-lg font-semibold text-white">{item.title}</Text>
      <Text className="mt-1 text-sm leading-5 text-forge-muted">{item.description}</Text>
    </GlassCard>
  );
}
