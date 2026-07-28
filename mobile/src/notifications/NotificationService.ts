import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { obtenerAsignacionesTurnoTrabajador } from "../modules/asignaciones-turno/api/services";
import { UsuarioSesion } from "../modules/trabajadores/types/trabajador";
import { obtenerTurno } from "../modules/turnos/api/services";
import { getUsuarioById } from "../modules/usuarios/api/services";

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
    name: "Turnos",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F",
  });
}

export const NotificationService = {
  requestPermissions: async () => {
    if (Platform.OS === "web") return false;
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  },

  probarNotificacionEnUnMinuto: async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧪 Prueba de Notificación",
        body: "Si ves esto, el sistema de notificaciones funciona correctamente.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        seconds: 600,
        repeats: false,
        channelId: "fichapp_canal_v2",
      } as any,
    });
  },

  programarAlarmasTurno: async (usuarioId: string) => {
    try {
      if (Platform.OS === "web") return;
      await Notifications.cancelAllScheduledNotificationsAsync();

      const usuario: UsuarioSesion = await getUsuarioById(usuarioId);
      if (!usuario?.trabajador_id) return;

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
        triggerEntrada.setHours(parseInt(hE, 10), parseInt(mE, 10), 0, 0);

        if (triggerEntrada < ahora) {
          triggerEntrada.setDate(triggerEntrada.getDate() + 1);
        }

        // Calcular segundos exactos de diferencia
        const segundosEntrada = Math.floor(
          (triggerEntrada.getTime() - ahora.getTime()) / 1000,
        );

        if (segundosEntrada > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "⏰ ¡Hora de fichar!",
              body: `Tu turno "${tInfo.nombre}" comienza ahora.`,
              sound: "default",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: segundosEntrada,
              repeats: false,
              channelId: "fichapp_canal_v2",
            } as any,
          });
        }

        // --- 2. NOTIFICACIÓN DE SALIDA ---
        const [hS, mS] = tInfo.hora_fin.split(":");
        const triggerSalida = new Date();
        triggerSalida.setHours(parseInt(hS, 10), parseInt(mS, 10), 0, 0);

        if (triggerSalida < ahora) {
          triggerSalida.setDate(triggerSalida.getDate() + 1);
        }

        // Calcular segundos exactos de diferencia
        const segundosSalida = Math.floor(
          (triggerSalida.getTime() - ahora.getTime()) / 1000,
        );

        if (segundosSalida > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🏁 Fin de turno",
              body: `Tu turno "${tInfo.nombre}" ha terminado.`,
              sound: "default",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: segundosSalida,
              repeats: false,
              channelId: "fichapp_canal_v2",
            } as any,
          });
        }
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
