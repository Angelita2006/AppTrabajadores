import { registrarTokenDispositivo } from "@/src/modules/another-services/services";
import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import {
  FontAwesome,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, View } from "react-native";
import {
  ProveedorSesion,
  useSesion,
} from "../src/modules/usuarios/store/SesionContextZustand";

// Configuración global de comportamiento de notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Evita que la pantalla de inicio del sistema desaparezca antes de tiempo
SplashScreen.preventAutoHideAsync?.();

function InitialLayout() {
  const { usuarioActual, cargandoSesionLocal } = useSesion();
  const segments = useSegments();
  const router = useRouter();
  const [estaListo, setEstaListo] = useState(false);

  // Control de sincronización inicial y Splash Screen nativo
  useEffect(() => {
    const timer = setTimeout(() => {
      setEstaListo(true);
      try {
        SplashScreen.hideAsync?.();
      } catch (e) {
        console.error("Error al ocultar el splash screen:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Interceptor global del botón de retroceso (BackHandler) por rol
  useEffect(() => {
    const backAction = () => {
      const currentRoute = segments[segments.length - 1];
      const tipo = usuarioActual?.tipo_usuario;
      const esAdminOControlador =
        tipo === "Admin_empresa" ||
        tipo === "Admin_gestoría" ||
        tipo === "Auditor_itss" ||
        tipo === "Representante_legal";

      if (
        esAdminOControlador &&
        (currentRoute === "home" || currentRoute === "(tabs)")
      ) {
        router.replace("/(tabs)/empresa");
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [segments, usuarioActual, router]);

  // Registrar token push y escuchar notificaciones al iniciar sesión
  useEffect(() => {
    if (!usuarioActual?.id) return;

    registrarTokenDispositivo(usuarioActual.id);

    const subRecibida = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notificación recibida en primer plano:", notification);
      },
    );

    const subRespuesta = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Usuario presionó la notificación:", data);

        if (data?.type === "OLVIDO_FICHAJE") {
          router.push("/(tabs)/perfil");
        }
      },
    );

    return () => {
      subRecibida.remove();
      subRespuesta.remove();
    };
  }, [usuarioActual]);

  // Efecto central de protección de rutas (Guard) antierrores
  useEffect(() => {
    if (!estaListo || cargandoSesionLocal) return;

    // Casteamos segments como string[] para evitar problemas con las tuplas estrictas de Expo Router
    const segs = segments as string[];
    const enGrupoAutenticacion = segs[0] === "(authentication)";
    const esRutaPublica =
      enGrupoAutenticacion || segs[0] === "politica-privacidad";

    const tieneSesion = usuarioActual !== null;
    const segmentLength = segs.length;

    const tipo = usuarioActual?.tipo_usuario;
    const esAdminOControlador =
      tipo === "Admin_empresa" ||
      tipo === "Admin_gestoría" ||
      tipo === "Auditor_itss" ||
      tipo === "Representante_legal";

    // Verificación segura utilizando el array casteado
    const esRutaHomeTab =
      segmentLength >= 2 && segs[0] === "(tabs)" && segs[1] === "home";

    if (tieneSesion && esAdminOControlador && esRutaHomeTab) {
      router.replace("/(tabs)/empresa");
      return;
    }

    if (!tieneSesion && !esRutaPublica) {
      router.replace("/");
    } else if (
      tieneSesion &&
      ((enGrupoAutenticacion && segmentLength > 0) || segmentLength === 0)
    ) {
      if (segs[0] !== "politica-privacidad") {
        if (esAdminOControlador) {
          router.replace("/(tabs)/empresa");
        } else {
          router.replace("/(tabs)/perfil");
        }
      }
    }
  }, [usuarioActual, cargandoSesionLocal, estaListo, segments]);

  if (!estaListo || cargandoSesionLocal) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="politica-privacidad"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="confirmar-cambio-email"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="(authentication)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Carga explícita de mapas de iconos para entornos Web y Móvil
  const [fuentesCargadas, errorFuentes] = useFonts({
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
  });

  if (!fuentesCargadas && !errorFuentes) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ProveedorSesion>
      <AppModalProvider>
        <InitialLayout />
      </AppModalProvider>
    </ProveedorSesion>
  );
}
