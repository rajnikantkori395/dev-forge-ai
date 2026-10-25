import { buildFallbackLinkedinContent } from '@/lib/linkedin-fallback';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { formatFunctionsInvokeError, generateLinkedinPost } from '@/services/ai';
import type { GeneratedPost, LinkedInPostContent } from '@/types';

export async function saveGeneratedPost(
  userId: string,
  input: { topic: string; tone: string; platform: string; content: LinkedInPostContent }
) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('generated_posts')
    .insert({
      user_id: userId,
      topic: input.topic,
      tone: input.tone,
      platform: input.platform,
      content: input.content,
    })
    .select('*')
    .single();
  if (error) {
    throw new Error(`Could not save post: ${error.message}${error.code ? ` [${error.code}]` : ''}`);
  }
  return data as GeneratedPost;
}

export async function fetchUserPosts(userId: string): Promise<GeneratedPost[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('generated_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as GeneratedPost[];
}

export async function createLinkedinDraft(input: {
  userId: string;
  topic: string;
  tone: string;
  platform: string;
  stack?: string[];
}): Promise<{ post: GeneratedPost; usedFallback: boolean; fallbackReason?: string }> {
  let content: LinkedInPostContent;
  let usedFallback = false;
  let fallbackReason: string | undefined;

  try {
    const raw = await generateLinkedinPost({
      topic: input.topic,
      tone: input.tone,
      platform: input.platform,
      stack: input.stack,
    });
    content = raw as LinkedInPostContent;
  } catch (e) {
    usedFallback = true;
    fallbackReason = await formatFunctionsInvokeError(e);
    content = buildFallbackLinkedinContent(input.topic, input.tone, input.platform);
  }

  const post = await saveGeneratedPost(input.userId, {
    topic: input.topic,
    tone: input.tone,
    platform: input.platform,
    content,
  });
  if (!post) {
    throw new Error(
      'Could not save post — Supabase is not configured in .env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }
  return { post, usedFallback, fallbackReason };
}
