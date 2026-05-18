import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { ProveedorTrabajador } from "../context/TrabajadorContext";
import { useColorScheme } from "../hooks/use-color-scheme";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const segments = useSegments();

  const { user, loading, loadSession } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      await loadSession();

      await SplashScreen.hideAsync();
    }

    prepare();
  }, [loadSession]);

  useEffect(() => {
    if (loading) return;

    //***//
    const inPublicGroup = (segments as readonly string[]).includes("(public)");

    if (!user && !inPublicGroup) {
      // Redirect to login if not authenticated
      router.replace("/(public)" as unknown as any); // cast to avoid TS route type error
    } else if (user && inPublicGroup) {
      // Redirect to protected area if authenticated but in public group
      // Use the actual leaf route, e.g., '/' or '/(tabs)'
      router.replace("/(tabs)" as unknown as any); // cast to avoid TS route type error
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ProveedorTrabajador>
        <Stack screenOptions={{ headerShown: false }} />

        <StatusBar style="auto" />
      </ProveedorTrabajador>
    </ThemeProvider>
  );
}
