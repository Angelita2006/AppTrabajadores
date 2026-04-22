import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ProveedorTrabajador } from "../context/TrabajadorContext";

export const unstable_settings = {
  anchor: "(tabs)",
};
// RootLayout es el componente principal que envuelve toda la aplicación. Proporciona el contexto del trabajador y el tema de colores
// a través de los proveedores correspondientes. También define la estructura de navegación utilizando Stack de react-navigation,
// con una pantalla principal (tabs) y una pantalla modal (modal).
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ProveedorTrabajador>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ProveedorTrabajador>
  );
}
