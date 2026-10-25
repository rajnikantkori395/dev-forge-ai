import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-chat:free';

type AiAction =
  | 'linkedin_post'
  | 'daily_missions'
  | 'quiz_question'
  | 'quiz_batch'
  | 'explore_feed'
  | 'interview_snippet';

type Body = {
  action: AiAction;
  payload: Record<string, unknown>;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLUG_FALLBACK: Record<AiAction, string> = {
  linkedin_post: 'default',
  daily_missions: 'balanced',
  quiz_question: 'conceptual',
  quiz_batch: 'conceptual',
  explore_feed: 'default',
  interview_snippet: 'system_design',
};

function effectiveTemplateSlug(action: AiAction, payload: Record<string, unknown>): string {
  const tid = typeof payload.templateId === 'string' ? payload.templateId.trim() : '';
  return tid || SLUG_FALLBACK[action];
}

function pick(map: Record<string, string>, id: string | undefined, fallback: string): string {
  const key = id && map[id] ? id : fallback;
  return map[key] ?? map[fallback] ?? Object.values(map)[0];
}

/** Inlined fallbacks when `prompt_templates` row missing or service role unavailable */
const LINKEDIN: Record<string, string> = {
  default:
    'Output ONLY valid JSON keys: hook (string), explanation (string), cta (string), hashtags (string[], max 6), fullPost (string). Credible, concise, no markdown fences.',
  technical_deep:
    'Same JSON shape as default. Lead with a technical constraint or invariant; include one tradeoff and numbers or latency where honest. No hype.',
  story:
    'Same JSON shape as default. Narrative arc: mistake → insight → takeaway. Human, still professional. No markdown fences.',
  listicle:
    'Same JSON shape as default. Deliver value as 3–5 numbered ideas inside fullPost; hook still punchy. JSON only.',
};

const MISSIONS: Record<string, string> = {
  balanced:
    'Output ONLY JSON: { "missions": [ … ] } exactly 6 objects: title, description, type ("dev_tip"|"interview"|"challenge"|"explore"|"architecture"|"productivity"), difficulty ("easy"|"medium"|"hard"), xp_reward (15–60), payload optional. Balance interview + build + explore.',
  interview_heavy:
    'Same schema as balanced. At least 3 missions must be interview or architecture (system design depth).',
  ship_heavy:
    'Same schema as balanced. At least 3 missions must be challenge or productivity (shipping, PRs, measurable output).',
};

const QUIZ_ONE: Record<string, string> = {
  conceptual:
    'Output ONLY JSON: { "question", "options"[4], "correct_answer" 0–3, "explanation", "difficulty" }. Focus definitions and mental models.',
  practical:
    'Same JSON schema. Focus what you would do in production: debugging, rollout, failure modes.',
  architecture:
    'Same JSON schema. Tradeoffs, scaling, consistency, boundaries — no trivia.',
};

const QUIZ_BATCH_SUFFIX =
  ' Output ONLY JSON: { "questions": [ … ] } — each entry same fields as single quiz: question, options[4], correct_answer, explanation, difficulty. No markdown.';

const EXPLORE: Record<string, string> = {
  default:
    'Output ONLY JSON: { "items": [ { "title", "description", "category", "difficulty": "beginner"|"intermediate"|"advanced", "url": string|null } ] }. Return 8 sharp items matching the user query. No markdown.',
  trending_stack:
    'Same JSON schema as default. Emphasize emerging tools, runtimes, frameworks, and ADRs teams are adopting in 2025–2026.',
  architecture:
    'Same JSON schema. Patterns, boundaries, sagas, CQRS, caches, idempotency — ground in real systems.',
  war_stories:
    'Same JSON schema. Outages, race conditions, misleading metrics, postmortems — teach through narrative.',
  productivity:
    'Same JSON schema. Deep work, reviews, CI feedback loops, focus — for senior ICs and leads.',
  career_interview:
    'Same JSON schema. Leveling, scope narratives, system design study plans, offer-side signal — still technical.',
};

const INTERVIEW: Record<string, string> = {
  system_design:
    'Output ONLY JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. Scenario-based system design prompt.',
  coding_signal:
    'Output ONLY JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. Coding / API design signal, not Leetcode trick-only.',
  behavioral:
    'Output ONLY JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. Behavioral with technical leadership angle.',
};

function buildSystemPromptFallback(action: AiAction, payload: Record<string, unknown>): string {
  const tid = typeof payload.templateId === 'string' ? payload.templateId : undefined;
  switch (action) {
    case 'linkedin_post':
      return `You are DevForge AI. ${pick(LINKEDIN, tid, 'default')}`;
    case 'daily_missions':
      return `You are DevForge AI. ${pick(MISSIONS, tid, 'balanced')}`;
    case 'quiz_question':
      return `You are DevForge AI. ${pick(QUIZ_ONE, tid, 'conceptual')}`;
    case 'quiz_batch': {
      const base = pick(QUIZ_ONE, tid, 'conceptual');
      const count = typeof payload.count === 'number' ? payload.count : 4;
      return `You are DevForge AI. ${base} Generate exactly ${count} distinct questions.${QUIZ_BATCH_SUFFIX}`;
    }
    case 'explore_feed':
      return `You are DevForge AI engineering editor. ${pick(EXPLORE, tid, 'default')}`;
    case 'interview_snippet':
      return `You are DevForge AI. ${pick(INTERVIEW, tid, 'system_design')}`;
  }
}

async function loadSystemPromptFromDb(
  admin: SupabaseClient | null,
  action: AiAction,
  slug: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  if (!admin) return null;
  const { data, error } = await admin
    .from('prompt_templates')
    .select('system_prompt')
    .eq('module', action)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error || !data?.system_prompt) return null;
  let prompt = data.system_prompt as string;
  if (action === 'quiz_batch') {
    const count = typeof payload.count === 'number' ? payload.count : 4;
    prompt = prompt.replace(/\{\{COUNT\}\}/g, String(count));
  }
  return prompt;
}

async function resolveSystemPrompt(
  admin: SupabaseClient | null,
  action: AiAction,
  payload: Record<string, unknown>
): Promise<string> {
  const slug = effectiveTemplateSlug(action, payload);
  const fromDb = await loadSystemPromptFromDb(admin, action, slug, payload);
  if (fromDb?.trim()) return fromDb.trim();
  return buildSystemPromptFallback(action, payload);
}

function maxTokens(action: AiAction): number {
  switch (action) {
    case 'quiz_batch':
      return 2800;
    case 'explore_feed':
    case 'daily_missions':
      return 2200;
    default:
      return 1400;
  }
}

function buildUserPrompt(action: AiAction, payload: Record<string, unknown>): string {
  return JSON.stringify({ action, payload });
}

async function persistAiOutput(args: {
  userClient: SupabaseClient;
  userId: string;
  body: Body;
  parsed: unknown;
}): Promise<void> {
  const slug = effectiveTemplateSlug(args.body.action, args.body.payload);
  try {
    const { error } = await args.userClient.from('ai_outputs').insert({
      user_id: args.userId,
      module: args.body.action,
      action: args.body.action,
      template_slug: slug,
      request_payload: args.body.payload,
      response_payload: args.parsed ?? {},
      provider: 'openrouter',
    });
    if (error) console.warn('[ai-assist] ai_outputs insert:', error.message);
  } catch (e) {
    console.warn('[ai-assist] ai_outputs insert exception:', String(e));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const admin =
      serviceKey.length > 0
        ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : null;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.action || !body?.payload) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = Deno.env.get('OPENROUTER_MODEL') ?? DEFAULT_MODEL;
    const system = await resolveSystemPrompt(admin, body.action, body.payload);

    const openRouterRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://devforge.ai',
        'X-OpenRouter-Title': 'DevForge AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: buildUserPrompt(body.action, body.payload) },
        ],
        temperature: 0.65,
        max_tokens: maxTokens(body.action),
      }),
    });

    if (!openRouterRes.ok) {
      const t = await openRouterRes.text();
      return new Response(JSON.stringify({ error: 'OpenRouter error', detail: t }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const completion = await openRouterRes.json();
    const text = completion?.choices?.[0]?.message?.content ?? '';

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { raw: text };
    }

    await persistAiOutput({
      userClient: supabase,
      userId: userData.user.id,
      body,
      parsed,
    });

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
