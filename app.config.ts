import type { ConfigContext, ExpoConfig } from 'expo/config';

const REQUIRED_PUBLIC_ENV = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;

/** Static settings live in app.json; this only blocks release builds that would ship without a backend. */
export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile && profile !== 'development') {
    const missing = REQUIRED_PUBLIC_ENV.filter((name) => !process.env[name]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `Missing ${missing.join(', ')} for EAS build profile "${profile}". ` +
          'Add them with `eas env:create --environment production` (and preview).'
      );
    }
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL!.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_SUPABASE_URL must use https:// for release builds.');
    }
  }
  return config as ExpoConfig;
};
