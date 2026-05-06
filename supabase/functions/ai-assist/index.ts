import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-chat:free';

type Body = {
  action: 'linkedin_post' | 'daily_missions' | 'quiz_question' | 'interview_snippet';
  payload: Record<string, unknown>;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystemPrompt(action: Body['action']): string {
  switch (action) {
    case 'linkedin_post':
      return `You are DevForge AI, a senior developer advocate. Output ONLY valid JSON with keys: hook (string), explanation (string), cta (string), hashtags (string array max 6), fullPost (string combining hook+body flow for LinkedIn). No markdown fences.`;
    case 'daily_missions':
      return `You are DevForge AI. Output ONLY valid JSON: { "missions": [ { "title": string, "description": string, "type": "dev_tip"|"interview"|"challenge"|"explore"|"architecture"|"productivity", "difficulty": "easy"|"medium"|"hard", "xp_reward": number 15-60, "payload": object optional } ] } with exactly 6 missions tailored to the user's stack and goals. No markdown.`;
    case 'quiz_question':
      return `You are DevForge AI. Output ONLY valid JSON: { "question": string, "options": [4 strings], "correct_answer": 0-3 index, "explanation": string, "difficulty": "easy"|"medium"|"hard" }. No markdown.`;
    case 'interview_snippet':
      return `You are DevForge AI. Output ONLY valid JSON: { "question": string, "rubric": string[], "sampleAnswer": string }. No markdown.`;
  }
}

function buildUserPrompt(action: Body['action'], payload: Record<string, unknown>): string {
  return JSON.stringify({ action, payload });
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

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

    const openRouterRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://devforge.ai',
        'X-Title': 'DevForge AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(body.action) },
          { role: 'user', content: buildUserPrompt(body.action, body.payload) },
        ],
        temperature: 0.7,
        max_tokens: 1200,
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
