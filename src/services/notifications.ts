import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

const ANDROID_CHANNEL_ID = 'default';

/** Required by `getExpoPushTokenAsync` (see expo-notifications ERR_NOTIFICATIONS_NO_EXPERIENCE_ID). */
function resolveExpoProjectId(): string | undefined {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_EAS_PROJECT_ID === 'string'
      ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID.trim()
      : '';
  if (fromEnv) return fromEnv;
  return (
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? undefined
  );
}

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Android 13+ only shows the permission prompt once at least one channel exists. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerForPushAsync(): Promise<string | null> {
  if (!isNative) return null;

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn(
        '[notifications] Push token skipped: no EAS projectId. Add `expo.extra.eas.projectId` (run `npx eas init`) or EXPO_PUBLIC_EAS_PROJECT_ID in .env.'
      );
    }
    return null;
  }

  try {
    if (!(await ensureNotificationPermission())) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[notifications] registerForPushAsync:', e);
    return null;
  }
}

export async function scheduleDailyReminder(hour = 9, minute = 0) {
  if (!isNative) return;
  try {
    if (!(await ensureNotificationPermission())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DevForge AI',
        body: "Today's Dev Mission is ready. Keep your streak alive.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[notifications] scheduleDailyReminder:', e);
  }
}

export async function notifyStreakRisk() {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Streak at risk',
      body: 'Open DevForge AI in the next few hours to protect your streak.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}
