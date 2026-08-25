import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 1. Configuración global de comportamiento en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 2. Registro del canal (Obligatorio para Android)
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("fichapp_canal_v2", {
    name: "Control de Fichajes y Alertas",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F",
  });
}

export const NotificationService = {
  requestPermissions: async () => {
    if (Platform.OS === "web") {
      // En web los permisos se piden mediante la API nativa de Firebase SDK o navegador
      const permission = await window.Notification?.requestPermission();
      return permission === "granted";
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  },

  /**
   * Programa alarmas o notificaciones locales para los turnos del usuario.
   */
  programarAlarmasTurno: async (usuarioId: string) => {
    if (Platform.OS === "web") return;

    try {
      // Lógica para programar alarmas o notificaciones locales si lo requieres
      console.log("Alarmas de turno listas para el usuario:", usuarioId);
    } catch (error) {
      console.error("Error al programar alarmas de turno:", error);
    }
  },

  /**
   * Registra el token FCM del dispositivo en el backend para que el servidor
   * pueda enviarle alertas de olvido de fichaje a los 10 minutos.
   */
  registrarDispositivoPushBackend: async (
    usuarioId: string,
    fcmToken: string,
  ) => {
    try {
      const plataforma =
        Platform.OS === "web"
          ? "web"
          : Platform.OS === "ios"
            ? "ios"
            : "android";

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/dispositivos-push/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usuario_id: usuarioId,
            fcm_token: fcmToken,
            plataforma: plataforma,
          }),
        },
      );

      if (!response.ok) {
        console.error("Error al sincronizar el token FCM con el backend");
      }
    } catch (error) {
      console.error("Excepción al registrar dispositivo push:", error);
    }
  },

  /**
   * Inicializa la escucha de notificaciones push enviadas por el servidor (FastAPI + FCM)
   */
  inicializarEscuchaPush: (usuarioId: string) => {
    if (Platform.OS === "web") {
      console.log("Escucha push en web manejada por Service Worker.");
      return;
    }

    // Escuchar notificaciones entrantes cuando la app está abierta en primer plano
    const unsubscribe = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          "Notificación push recibida en primer plano:",
          notification,
        );
      },
    );

    // Manejar cuando el usuario toca la notificación
    const unsubscribeResponse =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Usuario hizo clic en la notificación:", data);
      });

    return () => {
      unsubscribe.remove();
      unsubscribeResponse.remove();
    };
  },

  cancelarTodas: async () => {
    if (Platform.OS === "web") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
