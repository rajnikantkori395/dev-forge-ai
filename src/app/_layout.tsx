import 'react-native-gesture-handler';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import '../../global.css';
import 'react-native-reanimated';

import { createAppQueryClient } from '@/lib/query-client';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#070a0f',
    card: '#0d1117',
    primary: '#58a6ff',
    text: '#f0f6fc',
    border: '#1e2632',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  const queryClient = useMemo(() => createAppQueryClient(), []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      useAuthStore.getState().setHydrated(true);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        useAuthStore.getState().setSession(data.session);
      })
      .catch(() => {
        useAuthStore.getState().setSession(null);
      })
      .finally(() => {
        useAuthStore.getState().setHydrated(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      useAuthStore.getState().setSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#070a0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#58a6ff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#070a0f' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
