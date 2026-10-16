import { useEffect } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { Colors } from "@/src/constants/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSesion } from "@/src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "@/src/shared/components/ThemedText";

export default function PlataformaLayout() {
  const { usuarioActual, cargandoSesionLocal, tienePermiso } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useColorScheme();
  const permisosPantalla: Record<string, [string, string]> = {
    empresas: ["empresas", "consultar"],
    licencias: ["licencias", "consultar"],
    auditores: ["usuarios_empresas", "consultar"],
    auditoria: ["auditoria_accesos", "consultar"],
    informes: ["resumenes_jornada", "consultar"],
  };
  const pantallaActual = pathname
    .split("/")
    .filter(Boolean)
    .find((segment, index, parts) => parts[index - 1] === "superadministracion") ?? "";
  const permisoActual = permisosPantalla[pantallaActual];
  const puedeVerPantalla = permisoActual
    ? tienePermiso(permisoActual[0], permisoActual[1], "global")
    : false;

  useEffect(() => {
    if (!cargandoSesionLocal && usuarioActual && !puedeVerPantalla) {
      router.replace("/(tabs)/perfil");
    }
  }, [cargandoSesionLocal, puedeVerPantalla, router, usuarioActual]);

  if (cargandoSesionLocal || !usuarioActual || !puedeVerPantalla) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: Colors[theme].background }}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{
      headerShown: true,
      headerRight: () => <Pressable onPress={() => router.push("/(tabs)/perfil")} style={{ paddingHorizontal: 8 }}><ThemedText style={{ color: Colors[theme].primary, fontWeight: "700" }}>Perfil</ThemedText></Pressable>,
    }}>
      <Stack.Screen name="empresas" options={{ title: "Empresas" }} />
      <Stack.Screen name="empresas/[id]" options={{ title: "Detalle de empresa" }} />
      <Stack.Screen name="licencias" options={{ title: "Licencias" }} />
      <Stack.Screen name="auditores" options={{ title: "Auditores" }} />
      <Stack.Screen name="auditoria" options={{ title: "Auditoría de accesos" }} />
      <Stack.Screen name="informes" options={{ title: "Informes de jornada" }} />
    </Stack>
  );
}
