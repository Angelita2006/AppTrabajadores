import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { obtenerAsignacionesTurnoTrabajador } from "../modules/asignaciones-turno/api/services";
import { UsuarioSesion } from "../modules/trabajadores/types/trabajador";
import { obtenerTurno } from "../modules/turnos/api/services";
import { getUsuarioById } from "../modules/usuarios/api/services";
import { TipoUsuarioEnum } from "../modules/usuarios/types/usuario";

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

  // probarNotificacionEnUnMinuto: async () => {
  //   await Notifications.scheduleNotificationAsync({
  //     content: {
  //       title: "🧪 Prueba de Notificación",
  //       body: "Si ves esto, el sistema de notificaciones funciona correctamente.",
  //       sound: "default",
  //     },
  //     trigger: {
  //       type: Notifications.SchedulableTriggerInputTypes.DATE,
  //       seconds: 60,
  //       repeats: false,
  //       channelId: "fichapp_canal_v2",
  //     } as any,
  //   });
  // },

  programarAlarmasTurno: async (usuarioId: string) => {
    try {
      if (Platform.OS === "web") return;

      // Limpiamos cualquier notificación anterior para evitar duplicados o basura previa
      await Notifications.cancelAllScheduledNotificationsAsync();

      const usuario: UsuarioSesion = await getUsuarioById(usuarioId);

      if (usuario.tipo_usuario !== TipoUsuarioEnum.TRABAJADOR) return;

      // Si el usuario no existe o no tiene un trabajador_id asociado (ej. Admin puro), salimos.
      if (!usuario?.trabajador_id) return;

      // Obtenemos las asignaciones de turno del trabajador
      const asignaciones = await obtenerAsignacionesTurnoTrabajador(
        usuario.trabajador_id,
      );

      // Si no tiene asignaciones creadas (no tiene turno asignado aún), no programamos nada.
      if (!Array.isArray(asignaciones) || asignaciones.length === 0) return;

      const ahora = new Date();
      let turnosValidosEncontrados = 0;

      for (const asig of asignaciones) {
        if (!asig.turno_id) continue;

        const tInfo = await obtenerTurno(asig.turno_id);
        // Si el turno no existe o carece de hora de inicio/fin, omitimos
        if (!tInfo?.hora_inicio || !tInfo?.hora_fin) continue;

        const diasLaborables: number[] = tInfo.dias_semana || [];
        // Si el turno no tiene días de la semana configurados, no se puede programar
        if (diasLaborables.length === 0) continue;

        turnosValidosEncontrados++;

        // Iteramos los próximos 7 días para programar según su planificación real
        for (let i = 0; i < 7; i++) {
          const fechaIterada = new Date();
          fechaIterada.setDate(ahora.getDate() + i);

          const diaSemanaJS = fechaIterada.getDay(); // 0 = Domingo, 1 = Lunes...

          // Validamos si el día actual coincide con los días permitidos del turno
          if (!diasLaborables.includes(diaSemanaJS)) continue;

          const anio = fechaIterada.getFullYear();
          const mes = String(fechaIterada.getMonth() + 1).padStart(2, "0");
          const dia = String(fechaIterada.getDate()).padStart(2, "0");
          const fechaStr = `${anio}-${mes}-${dia}`;

          // --- 1. NOTIFICACIÓN DE ENTRADA ---
          const [hE, mE] = tInfo.hora_inicio.split(":");
          const triggerEntrada = new Date(
            `${fechaStr}T${hE.padStart(2, "0")}:${mE.padStart(2, "0")}:00`,
          );

          if (triggerEntrada > ahora) {
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
                  type: Notifications.SchedulableTriggerInputTypes
                    .TIME_INTERVAL,
                  seconds: segundosEntrada,
                  repeats: false,
                  channelId: "fichapp_canal_v2",
                } as any,
              });
            }
          }

          // --- 2. NOTIFICACIÓN DE SALIDA ---
          const [hS, mS] = tInfo.hora_fin.split(":");
          let triggerSalida = new Date(
            `${fechaStr}T${hS.padStart(2, "0")}:${mS.padStart(2, "0")}:00`,
          );

          // Manejo de turnos nocturnos (si la salida es menor o igual a la entrada en el mismo día)
          if (triggerSalida <= triggerEntrada) {
            triggerSalida.setDate(triggerSalida.getDate() + 1);
          }

          if (triggerSalida > ahora) {
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
                  type: Notifications.SchedulableTriggerInputTypes
                    .TIME_INTERVAL,
                  seconds: segundosSalida,
                  repeats: false,
                  channelId: "fichapp_canal_v2",
                } as any,
              });
            }
          }
        }
      }

      // Si tras revisar todas las asignaciones no se encontró ningún turno válido con horario y días, nos aseguramos de no dejar notificaciones huérfanas
      if (turnosValidosEncontrados === 0) {
        await Notifications.cancelAllScheduledNotificationsAsync();
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
