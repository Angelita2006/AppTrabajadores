import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';

import {
  Stack,
  useRouter,
  useSegments,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import { StatusBar } from 'expo-status-bar';

import { useEffect } from 'react';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { ProveedorTrabajador } from '@/context/TrabajadorContext';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const segments = useSegments();

  const {
    user,
    loading,
    loadSession,
  } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      await loadSession();

      await SplashScreen.hideAsync();
    }

    prepare();
  }, [loadSession]);

  useEffect(() => {
    if (loading) return;

    const inPublicGroup = segments.includes('(public)');

    if (!user && !inPublicGroup) {
      // Redirect to login if not authenticated
      router.replace('/(public)'); // Assuming login is at app/(public)/index.tsx
    } else if (user && inPublicGroup) {
      // Redirect to protected area if authenticated but in public group
      // Use the actual leaf route, e.g., '/' or '/(tabs)'
      router.replace('/(tabs)'); // Assuming protected tabs start at app/(protected)/(tabs)/_layout.tsx or app/(protected)/(tabs)/index.tsx
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <ProveedorTrabajador>
        <Stack screenOptions={{ headerShown: false }} />

        <StatusBar style="auto" />
      </ProveedorTrabajador>
    </ThemeProvider>
  );
}