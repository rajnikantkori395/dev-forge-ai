# DevForge AI — Usage guide

DevForge AI is an Expo (React Native) app with Expo Router, Supabase (auth + Postgres), and optional AI via a Supabase Edge Function + OpenRouter. This guide walks you from zero to a working daily flow.

---

## 1. Prerequisites

| Tool | Purpose |
|------|---------|
| **Node.js** (LTS) | Run Expo and tooling |
| **npm** | Install dependencies (`npm install`) |
| **Expo Go** (iOS/Android) | Quick testing (same SDK as your project) |
| **Supabase project** | Auth, database, Edge Functions |

Optional:

- **Supabase CLI** — `brew install supabase/tap/supabase` (or installer from Supabase docs) for migrations and `supabase functions deploy`
- **EAS / dev builds** — if you outgrow Expo Go constraints

---

## 2. Clone and install

```bash
cd dev-forge-ai
npm install
```

**Important:** Prefer Expo-aligned native dependency versions:

```bash
npx expo install @react-native-async-storage/async-storage
```

For Expo SDK 54 this pins **AsyncStorage 2.x**, which matches **Expo Go**. Using AsyncStorage **v3** can cause **“Native module is null … legacy storage”** on Go.

---

## 3. Environment variables

Copy the example file and edit **`.env`** in the **project root** (next to `package.json`):

```bash
cp .env.example .env
```

Fill in:

| Variable | Where it’s used |
|----------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |

Restart the dev server after changing `.env`:

```bash
npx expo start --clear
```

**Do not commit `.env`** (real keys).

**OpenRouter** is **not** set in Expo’s `.env` for production AI. Configure it only on Supabase Edge Function secrets (see §5).

---

## 4. Supabase database

Apply the schema (RLS, tables, triggers, seed data):

1. Open **Supabase Dashboard → SQL Editor**
2. Paste and run **`supabase/migrations/20250504000000_init.sql`** once
3. Then run **`supabase/migrations/20260207000000_explore_topics_insert.sql`** so the app can **insert AI-generated explore rows** (live search → persist)

Alternatively, with CLI linked to your project:

```bash
supabase db push
```

On sign-up, Supabase Auth creates an auth user; the migration’s trigger creates a **`profiles`** row.

---

## 5. Edge Function `ai-assist` (AI features)

The app calls **`ai-assist`** with an `action` and `payload` (including optional **`templateId`** per module):

| Action | Purpose |
|--------|---------|
| `linkedin_post` | LinkedIn-shaped JSON (`templateId`: default, technical_deep, story, listicle) |
| `daily_missions` | Six missions (`templateId`: balanced, interview_heavy, ship_heavy) |
| `quiz_question` | One MCQ (`templateId`: conceptual, practical, architecture) |
| `quiz_batch` | Multiple MCQs inserted into `quizzes` (`count` in payload) |
| `explore_feed` | Feed items persisted to `explore_topics` (`templateId`: default, trending_stack, architecture, …) |
| `interview_snippet` | Interview JSON (`templateId`: system_design, coding_signal, behavioral) |

```text
supabase.functions.invoke('ai-assist', { … })
```

### 5.1 Deploy

From the repo root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy ai-assist
```

`supabase/config.toml` sets **`verify_jwt = true`** for `ai-assist` (recommended).

### 5.2 Secrets (Supabase Dashboard)

**Edge Functions → `ai-assist` → Secrets** (or CLI `supabase secrets set`):

| Secret | Required? | Purpose |
|--------|-----------|---------|
| `OPENROUTER_API_KEY` | **Yes** for real AI | OpenRouter API bearer token |
| `OPENROUTER_MODEL` | Optional | Overrides default (`deepseek/deepseek-chat:free` in code) |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected for Edge Functions by Supabase automatically.

### 5.3 If AI still fails

- **404:** Function not deployed or wrong project ref.
- **401:** Signed out / expired token — sign in again.
- **500:** Missing `OPENROUTER_API_KEY` (or thrown error inside the function — check logs).
- **502:** OpenRouter rejected the request (bad model id, quota, or key).

The app falls back to a **deterministic LinkedIn template** when the Edge call fails so you can still demo “Generate” and persistence.

---

## 6. Run the app

```bash
npx expo start
```

Then:

- Scan the QR code with **Expo Go**, or press **`i` / `a`** for Simulator / Emulator
- **`w`** opens **web** (localStorage for auth; no native push scheduling)

Same machine and network as the phone when using Expo Go.

---

## 7. Platforms and limitations

### Expo Go vs dev build

- **Expo Go** — Fast iteration; native modules **must match** the SDK/version Expo ships (especially AsyncStorage as in §2).
- **Development build (`expo-dev-client`)** — Use when you add custom native modules or need versions Go doesn’t include.

### Web

- **`expo-notifications`** scheduling is **skipped on web** (not supported there).
- Supabase Auth uses **`localStorage`** instead of AsyncStorage.

### Notifications (iOS / Android)

Daily reminder code runs **only on native**. First launch may prompt for notification permission.

---

## 8. In-app flows (quick tour)

| Area | Path | Notes |
|------|------|--------|
| **Sign up / login** | Auth stack | Email + password via Supabase |
| **Onboarding** | After first login until `profiles.onboarding_completed` | Saves role, stack, goals, daily minutes |
| **Home (Forge)** | Tab “Forge” | Streak / XP / level, quick links, missions preview |
| **Missions** | Tab “Missions” | Completing marks `user_missions` and awards XP (RPC `award_xp`) |
| **Quiz sprint** | Tab “Quiz” → topic tile | Uses `router.push` to `/play/[topic]` |
| **Explore** | Live AI search + lens chips | Writes new rows into `explore_topics` each run (needs insert migration §4) |
| **Profile** | Tab “Profile” | Badges, recent generated posts, sign out |
| **AI Dev Tip** | Quick action / modal `/ai-generator` | LinkedIn-shaped draft + DB row; Edge optional (fallback exists) |

---

## 9. Troubleshooting

| Symptom | Things to try |
|---------|----------------|
| Blank screen early on load | Ensure **SafeAreaProvider** is in root (`src/app/_layout.tsx`); use `--clear`; check Metro / device logs |
| Expo Go AsyncStorage error | Use **`npx expo install @react-native-async-storage/async-storage`** per SDK §2 |
| “Edge Function non-2xx” | Deploy `ai-assist`, set **`OPENROUTER_API_KEY`**; read the in-app Alert / improved error messages |
| Quiz tap does nothing | Use latest code: Quiz hub uses **`router.push`** to `/play/[topic]` |
| Env not picked up | Restart Metro; confirm `.env` is at repo root; variable names prefixed `EXPO_PUBLIC_` |

### GitHub: `Permission denied (publickey)`

That is **SSH key / GitHub access**, not Expo. Typical fixes:

1. Add your SSH key to GitHub (**Settings → SSH and GPG keys**).
2. Or use HTTPS remote:  
   `git remote add origin https://github.com/USER/dev-forge-ai.git`
3. Test: `ssh -T git@github.com`

---

## 10. Useful commands (reference)

```bash
npm install
npx expo start --clear
npx expo install <package-name>
npx tsc --noEmit
supabase functions deploy ai-assist
supabase secrets set OPENROUTER_API_KEY=sk-or-...
```

---

## 11. Repo layout (where things live)

| Path | Purpose |
|------|---------|
| `src/app/` | Expo Router screens (`(auth)`, `(app)`, tabs, `/play/[topic]`) |
| `src/services/` | Supabase/API calls (`ai`, `missions`, `posts`, `quiz`, …) |
| `src/lib/supabase.ts` | Supabase client; web vs native storage handling |
| `supabase/migrations/` | Postgres schema |
| `supabase/functions/ai-assist/` | Edge Function (OpenRouter) |
| `.env.example` | Template env (no secrets) |

For product behavior beyond setup, infer from screen copy in the UI and typed tables in `src/types/index.ts`.
