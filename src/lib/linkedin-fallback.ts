import type { LinkedInPostContent } from '@/types';

/** Deterministic draft when Edge / OpenRouter is unavailable (still useful + saveable). */
export function buildFallbackLinkedinContent(
  topic: string,
  tone: string,
  platform: string
): LinkedInPostContent {
  const hook = `Hot take: ${topic} is where “it works on my machine” dies in production.`;
  const explanation = `(${tone} voice) Start with the constraint that changed your design, the metric you watch, and one mistake you won’t repeat. ${platform} rewards specificity over buzzwords — show the tradeoff you chose.`;
  const cta = `If you had to ship ${topic} next sprint, what’s your first commit?`;
  const hashtags = ['#DevForgeAI', '#SoftwareEngineering', '#LearningInPublic', '#BuildInPublic'];
  const fullPost = `${hook}\n\n${explanation}\n\n${cta}\n\n${hashtags.join(' ')}`;
  return { hook, explanation, cta, hashtags, fullPost };
}
