import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import {
  EstadoFichaje,
  RegistroFichaje,
  TipoFichaje,
} from "@/src/modules/fichajes/types/registrofichaje";
import {
  obtenerAsignacionesTurnoTrabajador,
  obtenerFichajesSemanaActual,
} from "@/src/modules/trabajadores/api/services";
import { useSesion } from "@/src/modules/trabajadores/store/SesionContext";
import { obtenerTurno } from "@/src/modules/turnos/services/services";
import { ItemTurno } from "@/src/modules/turnos/types/turno";
import { ThemedText } from "@/src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/src/shared/ui/AppSurface";
import { IconSymbol } from "@/src/shared/ui/icon-symbol";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

// Helper para comprobar si un día de la semana (0-6) entra en un patrón string como "LMXJV"
// Modifica esta función si tu backend devuelve los días laborables en otro formato.
const cumpleDiasSemana = (
  fecha: Date,
  diasPermitidosStr: string = "LMXJV",
): boolean => {
  const diaSemana = fecha.getDay();
  const mapeo: { [key: number]: string } = {
    1: "L", // Lunes
    2: "M", // Martes
    3: "X", // Miércoles
    4: "J", // Jueves
    5: "V", // Viernes
    6: "S", // Sábado
    0: "D", // Domingo
  };

  const letraDia = mapeo[diaSemana];
  return diasPermitidosStr.toUpperCase().includes(letraDia);
};

export default function HorariosScreen() {
  const { usuarioActual, empresaSeleccionada } = useSesion();
  const [cuadrante, setCuadrante] = useState<ItemTurno[]>([]);
  const [fichajesRealizados, setFichajesRealizados] = useState<
    RegistroFichaje[]
  >([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarPlanificacionYFichajes = async () => {
      if (!usuarioActual?.trabajador_id) {
        setCargando(false);
        return;
      }

      try {
        setCargando(true);

        // 1. Descargamos las asignaciones de turnos
        const asignaciones: AsignacionTurno[] =
          await obtenerAsignacionesTurnoTrabajador(
            usuarioActual!.trabajador_id,
          );

        // 2. Descargamos el historial de marcajes
        const todosLosFichajes = await obtenerFichajesSemanaActual(
          usuarioActual!.trabajador_id,
        );

        const fichajesFormateados: RegistroFichaje[] = todosLosFichajes.map(
          (f: any) => ({
            id: f.id,
            fecha_hora: f.fecha_hora,
            tipo_evento: String(
              f.tipo_evento,
            ) as unknown as RegistroFichaje["tipo_evento"],
            estado: f.estado,
            trabajador_id: f.trabajador_id ?? usuarioActual.trabajador_id,
            trabajador_nombre: f.trabajador_nombre ?? "",
            turno_nombre: f.turno_nombre ?? "",
            metodo_fichaje: f.metodo_fichaje ?? "",
          }),
        );

        setFichajesRealizados(fichajesFormateados);

        let turnos: ItemTurno[] = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas

        for (const asignacion_turno of asignaciones) {
          if (asignacion_turno.fecha_fin) {
            const fecha_inicio = new Date(asignacion_turno.fecha_inicio);
            const fecha_fin = new Date(asignacion_turno.fecha_fin);
            fecha_fin.setHours(23, 59, 59, 999); // Asegurar fin del día
            // FILTRO 1: Evitar asignaciones antiguas que ya terminaron antes de hoy
            if (fecha_fin < hoy) {
              continue;
            }

            const turno: ItemTurno = await obtenerTurno(
              asignacion_turno.turno_id,
            );

            // Asumimos que el turno o asignación puede traer una cadena de días laborables (ej: "LMXJV")
            // Si tu base de datos usa otro campo, reemplaza `turno.dias_semana` por el correcto.
            const diasLaborables = (turno as ItemTurno).diasSemana || "LMXJV";

            let fechaCursor = new Date(fecha_inicio);

            // Recorremos los días de la asignación
            while (fechaCursor <= fecha_fin) {
              // FILTRO 2: Solo generar el turno si coincide con los días de la semana válidos (ej: Lunes a Viernes)
              if (cumpleDiasSemana(fechaCursor, diasLaborables)) {
                const fechaInstanteActual = new Date(fechaCursor);

                const itemTurno: ItemTurno = {
                  id: Crypto.randomUUID(),
                  turno_id: turno.id,
                  empresa_id: turno.empresa_id,
                  nombre: fechaInstanteActual.toLocaleDateString("es-ES", {
                    weekday: "long",
                  }),
                  hora_inicio: turno.hora_inicio,
                  hora_fin: turno.hora_fin,
                  minutos_pausa_obligatoria: turno.minutos_pausa_obligatoria,
                  color_hex: turno.color_hex || "#2563EB",
                  fecha_real: fechaInstanteActual.toISOString().split("T")[0],
                  diasSemana: diasLaborables,
                  tipo_jornada: turno.tipo_jornada,
                };

                turnos.push(itemTurno);
              }

              // Avanzar un día
              fechaCursor.setDate(fechaCursor.getDate() + 1);
            }
          }
        }

        // Ordenar cuadrante cronológicamente
        turnos.sort((a, b) => {
          if (a.fecha_real !== b.fecha_real) {
            return a.fecha_real.localeCompare(b.fecha_real);
          }
          return a.hora_inicio.localeCompare(b.hora_inicio);
        });

        setCuadrante(turnos);
      } catch (error) {
        Alert.alert(
          "Error de Sincronización",
          "No se ha podido descargar tu calendario de turnos o marcajes.",
        );
      } finally {
        setCargando(false);
      }
    };

    if (usuarioActual?.trabajador_id) {
      cargarPlanificacionYFichajes();
    }
  }, [usuarioActual]);

  // ... El resto de tu render (return) y estilos se mantienen exactamente igual
  return (
    <AppScreen
      title="Mi Planificación"
      subtitle={`Calendario oficial asignado por: ${empresaSeleccionada?.nombre_comercial ?? "Tu Organización"}`}
    >
      {/* Tu JSX actual intacto */}
      <Row>
        <StatCard label="Turnos Vigentes" value={cuadrante.length.toString()} />
        <StatCard
          label="Vigencia"
          value={cuadrante[0] ? "Planificado" : "Sin asignar"}
          tone={cuadrante[0] ? "success" : "warning"}
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>
        Historial de Cuadrantes Asignados
      </ThemedText>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={{ gap: 12, paddingBottom: 20 }}>
          {cuadrante.map((item) => {
            const horaInicioTurno = item.hora_inicio.substring(0, 5);
            const horaFinTurno = item.hora_fin.substring(0, 5);
            const fechaRealStr = item.fecha_real;

            const aMinutos = (horaStr: string) => {
              const [h, m] = horaStr.split(":").map(Number);
              return h * 60 + m;
            };

            const minInicio = aMinutos(horaInicioTurno);
            let minFin = aMinutos(horaFinTurno);

            const esNocturno = minFin < minInicio;
            if (esNocturno) minFin += 24 * 60;

            const TOLERANCIA_MINS = 60;
            const limiteInferiorMins = minInicio - TOLERANCIA_MINS;
            const limiteSuperiorMins = minFin + TOLERANCIA_MINS;

            const obtenerMinutosFichaje = (fechaHoraIso: string) => {
              const partes = fechaHoraIso.split("T");
              if (!partes[1]) return 0;
              const horaLimpia = partes[1].substring(0, 5);
              return aMinutos(horaLimpia);
            };

            const marcajesDelDia = fichajesRealizados.filter((fichaje) => {
              if (fichaje.estado?.localeCompare(EstadoFichaje.VALIDO) !== 0)
                return false;
              const fechaFichajeStr = fichaje.fecha_hora.split("T")[0];
              if (fechaFichajeStr !== fechaRealStr) return false;

              const tipoEventoStr = String(fichaje.tipo_evento).toUpperCase();
              if (tipoEventoStr !== "ENTRADA" && tipoEventoStr !== "SALIDA")
                return false;

              let minsFichaje = obtenerMinutosFichaje(fichaje.fecha_hora);
              if (esNocturno && minsFichaje < limiteInferiorMins) {
                minsFichaje += 24 * 60;
              }

              return (
                minsFichaje >= limiteInferiorMins &&
                minsFichaje <= limiteSuperiorMins
              );
            });

            marcajesDelDia.sort(
              (a, b) =>
                new Date(a.fecha_hora).getTime() -
                new Date(b.fecha_hora).getTime(),
            );

            const pausasDelDia = fichajesRealizados.filter((fichaje) => {
              if (fichaje.estado?.localeCompare(EstadoFichaje.VALIDO) !== 0)
                return false;
              const fechaFichajeStr = fichaje.fecha_hora.split("T")[0];
              if (fechaFichajeStr !== fechaRealStr) return false;

              const tipoEventoStr = String(fichaje.tipo_evento).toUpperCase();
              const esPausa =
                fichaje.tipo_evento === TipoFichaje.INICIO_PAUSA ||
                tipoEventoStr === "INICIO_PAUSA" ||
                fichaje.tipo_evento === TipoFichaje.FIN_PAUSA ||
                tipoEventoStr === "FIN_PAUSA";

              if (!esPausa) return false;

              let minsFichaje = obtenerMinutosFichaje(fichaje.fecha_hora);
              if (esNocturno && minsFichaje < limiteInferiorMins) {
                minsFichaje += 24 * 60;
              }

              return (
                minsFichaje >= limiteInferiorMins &&
                minsFichaje <= limiteSuperiorMins
              );
            });

            let minutosConsumidos = 0;
            const pausasOrdenadas = [...pausasDelDia].sort(
              (a, b) =>
                new Date(a.fecha_hora).getTime() -
                new Date(b.fecha_hora).getTime(),
            );

            let marcaInicioPausa: number | null = null;
            pausasOrdenadas.forEach((fichaje) => {
              const tMs = new Date(fichaje.fecha_hora).getTime();
              const tipoEventoStr = String(fichaje.tipo_evento).toUpperCase();

              if (
                fichaje.tipo_evento === TipoFichaje.INICIO_PAUSA ||
                tipoEventoStr === "INICIO_PAUSA"
              ) {
                marcaInicioPausa = tMs;
              } else if (
                (fichaje.tipo_evento === TipoFichaje.FIN_PAUSA ||
                  tipoEventoStr === "FIN_PAUSA") &&
                marcaInicioPausa !== null
              ) {
                const diferenciaMinutos =
                  (tMs - marcaInicioPausa) / (1000 * 60);
                minutosConsumidos += Math.round(diferenciaMinutos);
                marcaInicioPausa = null;
              }
            });

            let minutosTrabajadosReales = 0;
            let marcaEntradaTurno: number | null = null;

            marcajesDelDia.forEach((fichaje) => {
              const tMs = new Date(fichaje.fecha_hora).getTime();
              const esEntrada =
                fichaje.tipo_evento === TipoFichaje.ENTRADA ||
                String(fichaje.tipo_evento).toUpperCase() === "ENTRADA";

              if (esEntrada) {
                marcaEntradaTurno = tMs;
              } else if (marcaEntradaTurno !== null) {
                minutosTrabajadosReales +=
                  (tMs - marcaEntradaTurno) / (1000 * 60);
                marcaEntradaTurno = null;
              }
            });

            minutosTrabajadosReales = Math.max(
              0,
              Math.round(minutosTrabajadosReales - minutosConsumidos),
            );

            const minutosTeoricosTotales = minFin - minInicio;
            const minutosTeoricosNetos = Math.max(
              0,
              minutosTeoricosTotales - (item?.minutos_pausa_obligatoria ?? 0),
            );

            const formatearAHorasYMinutos = (
              minutosTotales: number,
            ): string => {
              const hrs = Math.floor(minutosTotales / 60);
              const mins = minutosTotales % 60;
              return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
            };

            const textoTrabajadoReal = formatearAHorasYMinutos(
              minutosTrabajadosReales,
            );
            const textoTrabajadoTeorico =
              formatearAHorasYMinutos(minutosTeoricosNetos);

            return (
              <Card key={item.id}>
                <View style={styles.filaAsignacion}>
                  <View
                    style={[
                      styles.barraColor,
                      { backgroundColor: item.color_hex || "#2563EB" },
                    ]}
                  />
                  <View style={styles.cuerpoTarjeta}>
                    <View style={styles.headerTarjeta}>
                      <View>
                        <ThemedText style={styles.nombreTurno}>
                          {item?.nombre
                            ? item.nombre.toUpperCase()
                            : "Turno Sin Especificar"}
                        </ThemedText>
                        <ThemedText style={styles.fechaSubtexto}>
                          {item.fecha_real}
                        </ThemedText>
                      </View>
                      <View style={styles.badgeVigencia}>
                        <ThemedText style={styles.textoVigencia}>
                          Activo
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.gridHoras}>
                      <View style={styles.itemHora}>
                        <IconSymbol name="schedule" size={16} color="#475569" />
                        <ThemedText style={styles.textoHoras}>
                          {`${item.hora_inicio.substring(0, 5)} a ${item.hora_fin.substring(0, 5)}`}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.textoPausa}>
                        Descanso: {minutosConsumidos} /{" "}
                        {item?.minutos_pausa_obligatoria ?? 0} min.
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.gridHoras,
                        {
                          marginTop: 4,
                          paddingTop: 4,
                          borderTopWidth: 1,
                          borderTopColor: "#F1F5F9",
                        },
                      ]}
                    >
                      <View style={styles.itemHora}>
                        <IconSymbol
                          name="briefcase.fill"
                          size={18}
                          color="#475569"
                        />
                        <ThemedText
                          style={[styles.textoPausa, { color: "#334155" }]}
                        >
                          Jornada Efectiva
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.textoHoras,
                          {
                            fontSize: 13,
                            color:
                              minutosTrabajadosReales >= minutosTeoricosNetos
                                ? "#16803D"
                                : "#475569",
                          },
                        ]}
                      >
                        Trabajado: {textoTrabajadoReal} /{" "}
                        {textoTrabajadoTeorico}
                      </ThemedText>
                    </View>

                    {marcajesDelDia.length > 0 && (
                      <View style={styles.itemcontenedorFichajesReales}>
                        <View style={styles.separadorFichajes} />
                        <ThemedText style={styles.tituloFichajesSeccion}>
                          Marcajes en este turno:
                        </ThemedText>
                        {marcajesDelDia.map((fichaje) => {
                          const partes = fichaje.fecha_hora.split("T");
                          const horaLimpia = partes[1]
                            ? partes[1].substring(0, 5)
                            : "00:00";
                          const esEntrada =
                            fichaje.tipo_evento === TipoFichaje.ENTRADA ||
                            String(fichaje.tipo_evento).toUpperCase() ===
                              "ENTRADA";

                          return (
                            <View
                              key={fichaje.id}
                              style={styles.filaFichajeItem}
                            >
                              {esEntrada ? (
                                <FontAwesome5
                                  name="door-open"
                                  size={14}
                                  color="#065F46"
                                />
                              ) : (
                                <MaterialCommunityIcons
                                  name="exit-run"
                                  size={17}
                                  color="#991B1B"
                                />
                              )}
                              <ThemedText
                                style={[
                                  styles.textoFichajeItem,
                                  { color: esEntrada ? "#065F46" : "#991B1B" },
                                ]}
                              >
                                {esEntrada ? "ENTRADA" : "SALIDA"}: {horaLimpia}{" "}
                                hs.
                              </ThemedText>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            );
          })}

          {cuadrante.length === 0 && (
            <ThemedText style={styles.emptyText}>
              No tienes turnos planificados asignados.
            </ThemedText>
          )}
        </View>
      )}
    </AppScreen>
  );
}

// Conservamos tus estilos intactos abajo...
const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  filaAsignacion: {
    flexDirection: "row",
    width: "100%",
    minHeight: 90,
    gap: 14,
    paddingVertical: 2,
  },
  barraColor: { width: 5, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  cuerpoTarjeta: { flex: 1, padding: 12, gap: 4 },
  headerTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombreTurno: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  fechaSubtexto: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  badgeVigencia: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoVigencia: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16803D",
    textTransform: "uppercase",
  },
  gridHoras: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  itemHora: { flexDirection: "row", alignItems: "center", gap: 6 },
  textoHoras: { fontSize: 14, fontWeight: "700", color: "#334155" },
  textoPausa: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 24,
    lineHeight: 20,
  },
  itemcontenedorFichajesReales: { marginTop: 10 },
  separadorFichajes: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
    borderStyle: "dashed",
  },
  tituloFichajesSeccion: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  filaFichajeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 2,
  },
  textoFichajeItem: { fontSize: 12, fontWeight: "500" },
});
