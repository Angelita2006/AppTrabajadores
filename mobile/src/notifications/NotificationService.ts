import {
  getUsuarioById,
  obtenerAsignacionesTurnoTrabajador,
  obtenerTurno,
} from "@/src/modules/trabajadores/api/services";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { UsuarioSesion } from "../modules/trabajadores/types/trabajador";

// Configuración global (se ejecuta una sola vez al cargar la app)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  requestPermissions: async () => {
    if (Platform.OS === "web") return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
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

        // Si ya pasó la hora hoy, programar para mañana
        if (triggerEntrada <= ahora)
          triggerEntrada.setDate(triggerEntrada.getDate() + 1);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏰ ¡Hora de fichar!",
            body: `Tu turno "${tInfo.nombre}" comienza ahora. ¡Registra tu entrada!`,
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerEntrada,
          } as Notifications.NotificationTriggerInput,
        });

        const [hS, mS] = tInfo.hora_fin.split(":");
        const triggerSalida = new Date();
        triggerSalida.setHours(parseInt(hS), parseInt(mS), 0, 0);

        // Si ya pasó la hora hoy, programar para mañana
        if (triggerSalida <= ahora)
          triggerSalida.setDate(triggerSalida.getDate() + 1);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🏁 Fin de turno",
            body: `Tu turno "${tInfo.nombre}" ha terminado. ¡No olvides marcar tu salida!`,
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE, // Esto es lo que faltaba
            date: triggerEntrada,
          } as Notifications.NotificationTriggerInput,
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
