# Installing DevForge AI without the Play Store

How to build the real production app and install it on Android phones directly, until the Play
Store listing is live. The APK is the same app the store will ship: it runs on its own (no dev
server, no laptop), talks to the production Supabase project, and receives over-the-air updates
on the `production` channel.

| | Android |
| --- | --- |
| File | `.apk`, installed from a link |
| Cost | Free (Expo free plan) |
| Who can install | Anyone with the file |
| Phone setting needed | Allow installing apps from the browser or Files app |
| Expires | Never |

All builds run in the cloud on EAS, so no Android Studio is needed.

---

## What is already set up

| Item | Value |
| --- | --- |
| EAS account / project | `codewithrk` / [`@codewithrk/dev-forge-ai`](https://expo.dev/accounts/codewithrk/projects/dev-forge-ai) |
| Project ID | `6649d559-0649-40dc-9730-fd59bca132b3` (in `app.json` → `extra.eas.projectId`) |
| Android package | `com.codewithrk.devforgeai` (permanent: the Play Store uses the same one) |
| Signing key | Generated and stored by EAS |
| Build profiles (`eas.json`) | `sideload` (production APK), `preview` (test APK), `production` (Play Store AAB) |
| EAS environment variables | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `production`, `preview`, `development` |

`.env` is gitignored and never uploaded; cloud builds read the Supabase settings from the EAS
environment instead. `app.config.ts` fails the build if they are missing, so a broken APK can't
be produced by accident.

Check or change them:

```bash
eas env:list --environment production
eas env:update --name EXPO_PUBLIC_SUPABASE_URL --environment production --value https://<ref>.supabase.co
```

---

## 1. Backend checklist (Supabase)

The app talks to Supabase directly, so the project must be running:

1. **Project not paused.** Free Supabase projects pause after a week without activity. In the
   [dashboard](https://supabase.com/dashboard/project/achtddbyptylfjxhrpys), click
   **Restore project** if it shows as paused. While paused, sign-in fails with a network error.
2. **Migrations applied:** `supabase db push` (or run the files in `supabase/migrations/` in the
   SQL editor, in order).
3. **Edge function deployed:** `supabase functions deploy ai-assist`, with the
   `OPENROUTER_API_KEY` secret set (Dashboard → Edge Functions → Secrets).
4. **Email confirmation:** if Auth → Providers → Email → *Confirm email* is on, new users must
   tap the link in the confirmation email before signing in.

---

## 2. Build the APK

```bash
npm run build:sideload:android
```

- EAS builds what's in your working tree (uncommitted changes included, `.gitignore`d files
  excluded). Committing first is still recommended so each build maps to a commit.
- The build takes about 10–20 minutes (longer in the free-plan queue). The terminal and
  [the builds page](https://expo.dev/accounts/codewithrk/projects/dev-forge-ai/builds) show a
  link with the `.apk` download and an **Install** QR code.
- Back up the signing key once: `eas credentials -p android` → *Download credentials*. Store the
  file somewhere safe (not in git). Every future APK must be signed with this key, otherwise
  phones refuse to update the app.

## 3. Install on a phone

1. Open the build link on the phone (or scan the QR code on the build page) and download the
   `.apk`. Alternatively download it on your laptop and share it through Google Drive.
   Chat apps sometimes rename or compress APKs.
2. Tap the downloaded file. If Android says it isn't allowed to install unknown apps from this
   source, tap **Settings** and allow it for the app you downloaded with (Chrome, Files, Drive).
3. If **Play Protect** warns about an unknown app, tap **More details** → **Install anyway**.
   This appears for any app that doesn't come from Google Play.
4. Open **DevForge AI**, sign in or create an account, and allow notifications when asked
   (used for the daily 9:00 mission reminder).

Over USB instead: enable USB debugging, then `adb install path/to/app.apk`.

---

## 4. Keeping installed apps up to date

| Change | What to do | Reaches phones |
| --- | --- | --- |
| Database / edge function | `supabase db push` / `supabase functions deploy ai-assist` | Immediately |
| Screens, logic, styling (JavaScript only) | `npm run update:prod` | Downloaded on next launch, applied on the launch after |
| New native library, Expo SDK upgrade, icon, permissions, `app.json` | Bump `version` in `app.json`, rebuild, reinstall | When people install the new APK |

- Over-the-air updates only reach builds with the same `version` (`runtimeVersion` policy
  `appVersion`), so a phone never receives JavaScript its build can't run.
- **Reinstalling:** install the new APK over the old one. `versionCode` increases automatically
  (stored on EAS) and the same keystore signs every build, so Android treats it as an update and
  people stay signed in.
- Test risky changes first on a preview build: `npm run build:preview`, then
  `npm run update:preview`. Preview builds use the `preview` channel, so production phones
  don't receive those updates.

---

## 5. When you publish to Google Play

```bash
npm run build:prod          # Android App Bundle (.aab) on the production channel
eas submit -p android --profile production   # uploads to the "internal" track
```

Google Play re-signs apps with its own key (Play App Signing), so the Play version can't install
over a sideloaded APK. Ask people to **uninstall the sideloaded app first**, then install from
Play. Nothing is lost: all data lives in Supabase, so they only sign in again.

The first Play upload must be done manually in the Play Console (create the app, upload the
`.aab` once). After that, `eas submit` works with a Google service account key.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Build fails: `Missing EXPO_PUBLIC_SUPABASE_URL…` | The EAS environment variables are gone. Re-create them with `eas env:create` (see top of this file). |
| Sign-in shows a network error / "Failed to fetch" | The Supabase project is paused or down. Restore it in the dashboard (section 1). |
| AI features say "Edge Function …" errors | Deploy `ai-assist` and set `OPENROUTER_API_KEY` (section 1). |
| No daily reminder | Notifications were denied. Enable them in Android Settings → Apps → DevForge AI → Notifications. |
| "App not installed" / "package conflicts with an existing package" | A copy signed with a different key is installed (for example from Google Play). Uninstall it, then install. |
| "There was a problem parsing the package" | The download didn't finish, or the phone's Android version is too old (Android 7.0+ required). Download again on Wi-Fi. |
| A JavaScript update didn't arrive | Close and reopen the app twice: the first launch downloads it, the next one applies it. Check the update was published to the `production` channel. |
