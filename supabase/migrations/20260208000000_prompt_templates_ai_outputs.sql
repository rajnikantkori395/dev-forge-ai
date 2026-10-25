-- Editable AI system prompts + automatic capture of every successful generation

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  slug text not null,
  label text not null default '',
  system_prompt text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_templates_module_slug_key unique (module, slug),
  constraint prompt_templates_module_check check (
    module = any (
      array[
        'linkedin_post'::text,
        'daily_missions'::text,
        'quiz_question'::text,
        'quiz_batch'::text,
        'explore_feed'::text,
        'interview_snippet'::text
      ]
    )
  )
);

create index prompt_templates_module_active_idx on public.prompt_templates (module, active, sort_order);

alter table public.prompt_templates enable row level security;

comment on table public.prompt_templates is
'System prompts for ai-assist. Read from Edge Function with SERVICE_ROLE only (no public policies). Edit in Dashboard.';

create table public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module text not null,
  action text not null,
  template_slug text not null default 'default',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  provider text default 'openrouter',
  created_at timestamptz not null default now()
);

create index ai_outputs_user_created_idx on public.ai_outputs (user_id, created_at desc);
create index ai_outputs_module_idx on public.ai_outputs (module);

alter table public.ai_outputs enable row level security;

create policy "ai_outputs_select_own"
on public.ai_outputs for select
using (auth.uid() = user_id);

create policy "ai_outputs_insert_own"
on public.ai_outputs for insert
with check (auth.uid() = user_id);

-- Seed prompts (mirror Edge fallbacks — {{COUNT}} for quiz_batch)
insert into public.prompt_templates (module, slug, label, system_prompt, sort_order)
values
  (
    'linkedin_post',
    'default',
    'Default',
    $p$You are DevForge AI, a senior developer advocate. Output ONLY valid JSON keys: hook (string), explanation (string), cta (string), hashtags (string[], max 6), fullPost (string). Credible, concise, no markdown fences.$p$,
    10
  ),
  (
    'linkedin_post',
    'technical_deep',
    'Technical deep',
    $p$You are DevForge AI, a senior developer advocate. Same JSON shape as default: hook, explanation, cta, hashtags[], fullPost. Lead with a technical constraint or invariant; include one tradeoff and numbers or latency where honest. No hype. No markdown fences.$p$,
    20
  ),
  (
    'linkedin_post',
    'story',
    'Story',
    $p$You are DevForge AI. Same JSON shape as default: hook, explanation, cta, hashtags[], fullPost. Narrative arc: mistake → insight → takeaway. Human, still professional. No markdown fences.$p$,
    30
  ),
  (
    'linkedin_post',
    'listicle',
    'Listicle',
    $p$You are DevForge AI. Same JSON shape as default: hook, explanation, cta, hashtags[], fullPost. Deliver value as 3–5 numbered ideas inside fullPost; hook still punchy. JSON only.$p$,
    40
  ),

  (
    'daily_missions',
    'balanced',
    'Balanced',
    $p$You are DevForge AI. Output ONLY JSON: { "missions": [ … ] } with exactly 6 objects. Each mission: title, description, type ("dev_tip"|"interview"|"challenge"|"explore"|"architecture"|"productivity"), difficulty ("easy"|"medium"|"hard"), xp_reward number 15-60, payload optional object. Balance interview + hands-on + explore. No markdown.$p$,
    10
  ),
  (
    'daily_missions',
    'interview_heavy',
    'Interview-heavy',
    $p$You are DevForge AI. Same JSON schema as balanced (exactly 6 missions). At least 3 missions must be type interview or architecture (system-design depth). No markdown.$p$,
    20
  ),
  (
    'daily_missions',
    'ship_heavy',
    'Ship-heavy',
    $p$You are DevForge AI. Same JSON schema as balanced (exactly 6 missions). At least 3 missions must be challenge or productivity (shipping, PRs, measurable output). No markdown.$p$,
    30
  ),

  (
    'quiz_question',
    'conceptual',
    'Conceptual',
    $p$You are DevForge AI. Output ONLY JSON: { "question": string, "options": [4 strings], "correct_answer": number 0-3, "explanation": string, "difficulty": "easy"|"medium"|"hard" }. Definitions and mental models — no trivia. No markdown.$p$,
    10
  ),
  (
    'quiz_question',
    'practical',
    'Practical',
    $p$You are DevForge AI. Same JSON schema as conceptual. Focus what you would do in production: debugging, rollout, failure modes. No markdown.$p$,
    20
  ),
  (
    'quiz_question',
    'architecture',
    'Architecture',
    $p$You are DevForge AI. Same JSON schema as conceptual. Tradeoffs, scaling, consistency, boundaries — no trivia. No markdown.$p$,
    30
  ),

  (
    'quiz_batch',
    'conceptual',
    'Conceptual',
    $p$You are DevForge AI. Output ONLY JSON: { "questions": [ … ] }. Each question: question, options[4], correct_answer 0-3, explanation, difficulty. Focus definitions and mental models. Generate exactly {{COUNT}} distinct questions. No markdown fences.$p$,
    10
  ),
  (
    'quiz_batch',
    'practical',
    'Practical',
    $p$You are DevForge AI. Same JSON schema — array "questions". Production debugging, rollout, failure modes. Generate exactly {{COUNT}} distinct questions. No markdown.$p$,
    20
  ),
  (
    'quiz_batch',
    'architecture',
    'Architecture',
    $p$You are DevForge AI. Same JSON schema — array "questions". Scaling, consistency, CAP, caching, idempotency. Generate exactly {{COUNT}} distinct questions. No markdown.$p$,
    30
  ),

  (
    'explore_feed',
    'default',
    'General',
    $p$You are DevForge AI engineering editor. Output ONLY JSON: { "items": [ { "title", "description", "category", "difficulty": "beginner"|"intermediate"|"advanced", "url": string|null } ] }. Return 8 sharp items matching the user query. No markdown.$p$,
    10
  ),
  (
    'explore_feed',
    'trending_stack',
    'Trending stack',
    $p$You are DevForge AI engineering editor. Same JSON schema (8 items). Emphasize emerging tools, runtimes, frameworks, and ADRs teams adopt in 2025–2026. No markdown.$p$,
    20
  ),
  (
    'explore_feed',
    'architecture',
    'Architecture lens',
    $p$You are DevForge AI engineering editor. Same JSON schema (8 items). Patterns: boundaries, sagas, CQRS, caches, idempotency — ground in real systems. No markdown.$p$,
    30
  ),
  (
    'explore_feed',
    'war_stories',
    'War stories',
    $p$You are DevForge AI engineering editor. Same JSON schema (8 items). Outages, race conditions, misleading metrics, postmortems — narrative teaching. No markdown.$p$,
    40
  ),
  (
    'explore_feed',
    'productivity',
    'Productivity',
    $p$You are DevForge AI engineering editor. Same JSON schema (8 items). Deep work, code review loops, CI signal, IC and lead cadence. No markdown.$p$,
    50
  ),
  (
    'explore_feed',
    'career_interview',
    'Career & interview',
    $p$You are DevForge AI engineering editor. Same JSON schema (8 items). Leveling, scope narratives, system-design study rituals, still technical substance. No markdown.$p$,
    60
  ),

  (
    'interview_snippet',
    'system_design',
    'System design',
    $p$You are DevForge AI. Output ONLY JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. Scenario-based system design interview prompt. No markdown.$p$,
    10
  ),
  (
    'interview_snippet',
    'coding_signal',
    'Coding signal',
    $p$You are DevForge AI. Output ONLY JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. Coding or API-design signal — not pure LeetCode tricks. No markdown.$p$,
    20
  ),
  (
    'interview_snippet',
    'behavioral',
    'Behavioral',
    $p$You are DevForge AI. Output ONLY JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. Behavioral with technical leadership angles. No markdown.$p$,
    30
  )
on conflict on constraint prompt_templates_module_slug_key do update
set
  system_prompt = excluded.system_prompt,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

grant select, insert on public.ai_outputs to authenticated;
