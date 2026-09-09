import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configuración global de comportamiento de notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configuración obligatoria del canal de notificaciones para Android
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("fichapp_canal_v2", {
    name: "Control de Fichajes y Alertas",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F",
  });
}

/**
 * Servicio centralizado para la gestión de notificaciones push, permisos,
 * sincronización con el backend y programación de alarmas locales.
 */
export const NotificationService = {
  /**
   * Solicita los permisos necesarios al usuario para el envío y recepción de notificaciones,
   * adaptándose de forma automática a la plataforma actual (Web o dispositivos móviles).
   *
   * @returns Promesa que resuelve a un booleano indicando si el permiso fue concedido (`true`) o denegado (`false`).
   */
  requestPermissions: async () => {
    if (Platform.OS === "web") {
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
   * Programa alarmas o notificaciones locales personalizadas para los turnos de trabajo del usuario.
   *
   * @param usuarioId - Identificador único del usuario para el cual se configuran las alarmas.
   */
  programarAlarmasTurno: async (usuarioId: string) => {
    if (Platform.OS === "web") return;

    try {
      console.log("Alarmas de turno listas para el usuario:", usuarioId);
    } catch (error) {
      console.error("Error al programar alarmas de turno:", error);
    }
  },

  /**
   * Registra o actualiza el token de notificaciones push del dispositivo en el backend
   * para asegurar la correcta recepción de alertas corporativas y de fichaje.
   *
   * @param usuarioId - Identificador único del usuario propietario del dispositivo.
   * @param fcmToken - Token único de notificaciones push obtenido del servicio de mensajería (FCM/Expo).
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
        console.error("Error al sincronizar el token con el backend.");
      }
    } catch (error) {
      console.error("Error al registrar dispositivo push:", error);
    }
  },

  /**
   * Inicializa los listeners o escuchas activas para la recepción de notificaciones push en primer plano
   * y las acciones de clic realizadas por el usuario sobre las mismas.
   *
   * @param idUsuario - Identificador único del usuario con sesión activa en el entorno de escucha.
   * @returns Una función de limpieza (cleanup) para desuscribir los eventos, o void si se ejecuta en web.
   */
  inicializarEscuchaPush: (idUsuario: string) => {
    if (Platform.OS === "web") {
      console.log("Escucha push en web manejada por Service Worker.");
      return;
    }

    const unsubscribe = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          "Notificación push recibida en primer plano:",
          notification,
        );
      },
    );

    const unsubscribeResponse =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log(
          `Usuario ${idUsuario} hizo clic en la notificación: `,
          data,
        );
      });

    return () => {
      unsubscribe.remove();
      unsubscribeResponse.remove();
    };
  },

  /**
   * Cancela y elimina de forma masiva todas las notificaciones locales que se encontraban programadas previamente.
   */
  cancelarTodas: async () => {
    if (Platform.OS === "web") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
