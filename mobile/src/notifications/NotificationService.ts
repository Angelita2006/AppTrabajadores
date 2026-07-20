import {
  getUsuarioById,
  obtenerAsignacionesTurnoTrabajador,
  obtenerTurno,
} from "@/src/modules/trabajadores/api/services";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { UsuarioSesion } from "../modules/trabajadores/types/trabajador";

// 1. Configuración global
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 2. Registro del canal (Obligatorio para Android antes de enviar nada)
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("fichapp_canal_v2", {
    name: "Turnos",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F",
  });
}

export const NotificationService = {
  requestPermissions: async () => {
    if (Platform.OS === "web") return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  },

  probarNotificacionEnUnMinuto: async () => {
    const triggerDePrueba = new Date(new Date().getTime() + 45 * 1000);
    const formatoHora = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(triggerDePrueba);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧪 Prueba de Notificación",
        body: "Si ves esto, el sistema de notificaciones funciona correctamente.",
        android: {
          channelId: "fichapp_canal_v2",
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDePrueba,
      },
    });

    console.log("Prueba programada para:", formatoHora);
  },

  programarAlarmasTurno: async (usuarioId: string) => {
    try {
      if (Platform.OS === "web") return;
      await Notifications.cancelAllScheduledNotificationsAsync();

      const usuario: UsuarioSesion = await getUsuarioById(usuarioId);
      const asignaciones = await obtenerAsignacionesTurnoTrabajador(
        usuario.trabajador_id,
      );

      if (!Array.isArray(asignaciones)) return;

      const ahora = new Date();

      for (const asig of asignaciones) {
        const tInfo = await obtenerTurno(asig.turno_id);
        if (!tInfo?.hora_inicio || !tInfo?.hora_fin) continue;

        // --- 1. NOTIFICACIÓN DE ENTRADA ---
        const [hE, mE] = tInfo.hora_inicio.split(":");
        const triggerEntrada = new Date();
        triggerEntrada.setHours(parseInt(hE), parseInt(mE), 0, 0);

        if (triggerEntrada <= ahora)
          triggerEntrada.setDate(triggerEntrada.getDate() + 1);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏰ ¡Hora de fichar!",
            body: `Tu turno "${tInfo.nombre}" comienza ahora.`,
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerEntrada,
          },
        });

        // --- 2. NOTIFICACIÓN DE SALIDA ---
        const [hS, mS] = tInfo.hora_fin.split(":");
        const triggerSalida = new Date();
        triggerSalida.setHours(parseInt(hS), parseInt(mS), 0, 0);

        if (triggerSalida <= ahora)
          triggerSalida.setDate(triggerSalida.getDate() + 1);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🏁 Fin de turno",
            body: `Tu turno "${tInfo.nombre}" ha terminado.`,
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerSalida,
          },
        });
      }
    } catch (error) {
      console.error("Error programando notificaciones:", error);
    }
  },

  cancelarTodas: async () => {
    if (Platform.OS === "web") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
