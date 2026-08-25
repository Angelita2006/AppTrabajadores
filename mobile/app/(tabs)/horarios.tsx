import { obtenerAsignacionesTurnoTrabajador } from "@/src/modules/asignaciones-turno/api/services";
import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import { obtenerFichajesTurnoActual } from "@/src/modules/fichajes/api/services";
import {
  DIAS_SEMANA,
  EstadoFichaje,
  RegistroFichaje
} from "@/src/modules/fichajes/types/registrofichaje";
import { obtenerTurno } from "@/src/modules/turnos/api/services";
import { Turno } from "@/src/modules/turnos/types/turno";
import { useSesion } from "@/src/modules/usuarios/store/SesionContext";
import { TipoUsuarioEnum } from "@/src/modules/usuarios/types/usuario";
import { ThemedText } from "@/src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/src/shared/ui/AppSurface";
import { IconSymbol } from "@/src/shared/ui/icon-symbol";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  View,
} from "react-native";

const cumpleDiasSemana = (
  fecha: Date,
  diasPermitidosStr: number[],
): boolean => {
  const diaSemana = fecha.getDay();
  return diasPermitidosStr.includes(diaSemana);
};

const aMinutos = (horaStr: string): number => {
  if (!horaStr) return 0;
  const [h, m] = horaStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const obtenerMinutosFichaje = (fechaHoraIso: string): number => {
  const partes = fechaHoraIso.split("T");
  if (!partes[1]) return 0;
  const horaLimpia = partes[1].substring(0, 5);
  return aMinutos(horaLimpia);
};

const formatearAHorasYMinutos = (minutosTotales: number): string => {
  const hrs = Math.floor(minutosTotales / 60);
  const mins = minutosTotales % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};
export default function HorariosScreen() {
  const { usuarioActual, empresaSeleccionada } = useSesion();
  const [cuadrante, setCuadrante] = useState<Turno[]>([]);
  const [fichajesRealizados, setFichajesRealizados] = useState<
    RegistroFichaje[]
  >([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargarPlanificacionYFichajes = async () => {
      if (
        !usuarioActual?.trabajador_id &&
        (usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_EMPRESA ||
          usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_GESTORIA)
      ) {
        if (isMounted) setCargando(false);
        return;
      }

      try {
        if (isMounted) setCargando(true);

        const trabajadorId = usuarioActual?.trabajador_id;
        if (!trabajadorId) return;

        const [asignaciones, todosLosFichajes]: [
          AsignacionTurno[],
          RegistroFichaje[],
        ] = await Promise.all([
          obtenerAsignacionesTurnoTrabajador(trabajadorId),
          obtenerFichajesTurnoActual(trabajadorId),
        ]);

        const fichajesFormateados: RegistroFichaje[] = todosLosFichajes.map(
          (f: Record<string, any>) => ({
            id: f.id,
            fecha_hora: f.fecha_hora,
            tipo_evento_id: f.tipo_evento_id ?? f.tipo_evento,
            // Guardamos también el código normalizado en mayúsculas por si viene directo del backend (ej: f.codigo o f.tipo_base)
            codigo_evento: (f.codigo_evento ?? f.codigo ?? "").toUpperCase(),
            estado: f.estado,
            trabajador_id: f.trabajador_id ?? trabajadorId,
            trabajador_nombre: f.trabajador_nombre ?? "",
            turno_nombre: f.turno_nombre ?? "",
            metodo_fichaje: f.metodo_fichaje ?? "",
          }),
        );

        if (!isMounted) return;
        setFichajesRealizados(fichajesFormateados);

        let turnos: Turno[] = [];
        const hoy = new Date();
        hoy.setHours(12, 0, 0, 0);

        for (const asignacion_turno of asignaciones) {
          if (!asignacion_turno.fecha_inicio) continue;

          const fecha_inicio = new Date(asignacion_turno.fecha_inicio);
          fecha_inicio.setHours(12, 0, 0, 0);

          let fecha_fin: Date;
          if (asignacion_turno.fecha_fin) {
            fecha_fin = new Date(asignacion_turno.fecha_fin);
          } else {
            fecha_fin = new Date();
            fecha_fin.setMonth(fecha_fin.getMonth() + 2);
          }
          fecha_fin.setHours(12, 0, 0, 0);

          if (fecha_fin < hoy) continue;

          const turnoData = await obtenerTurno(asignacion_turno.turno_id);
          if (!turnoData) continue;

          const diasLaborables = turnoData.dias_semana;
          let fechaCursor = new Date(fecha_inicio);

          let seguridad = 0;
          while (fechaCursor <= fecha_fin && seguridad < 180) {
            seguridad++;
            if (cumpleDiasSemana(fechaCursor, diasLaborables)) {
              const anio = fechaCursor.getFullYear();
              const mes = String(fechaCursor.getMonth() + 1).padStart(2, "0");
              const dia = String(fechaCursor.getDate()).padStart(2, "0");
              const fechaLocalStr = `${anio}-${mes}-${dia}`;

              const itemTurno = {
                id: `${asignacion_turno.id || "t"}-${fechaLocalStr}`,
                empresa_id: turnoData.empresa_id,
                nombre: turnoData.nombre,
                hora_inicio: turnoData.hora_inicio,
                hora_fin: turnoData.hora_fin,
                duracion_pausa_minutos: turnoData.duracion_pausa_minutos,
                color_hex: turnoData.color_hex || "#2563EB",
                dias_semana: diasLaborables,
                created_at: turnoData.created_at || new Date().toISOString(),
                fecha_real: fechaLocalStr,
              } as Turno & { fecha_real: string };

              turnos.push(itemTurno);
            }
            fechaCursor.setDate(fechaCursor.getDate() + 1);
          }
        }

        turnos.sort((a, b) => {
          const fechaA = (a as Turno & { fecha_real: string }).fecha_real || "";
          const fechaB = (b as Turno & { fecha_real: string }).fecha_real || "";

          if (fechaA !== fechaB) {
            return fechaA.localeCompare(fechaB);
          }
          return a.hora_inicio.localeCompare(b.hora_inicio);
        });

        if (isMounted) setCuadrante(turnos);
      } catch (error: unknown) {
        const mensajeAmigable = obtenerMensajeAmigableError(error);
        if (Platform.OS === "web") {
          window.alert(`Error de Sincronización: ${mensajeAmigable}`);
        } else {
          Alert.alert("Error de Sincronización", mensajeAmigable);
        }
      } finally {
        if (isMounted) setCargando(false);
      }
    };

    cargarPlanificacionYFichajes();

    return () => {
      isMounted = false;
    };
  }, [usuarioActual]);

  return (
    <AppScreen
      title="Mi Planificación"
      subtitle={`Calendario oficial asignado por: ${empresaSeleccionada?.nombre_comercial ?? "Tu Organización"}`}
    >
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
          {cuadrante.map((item: Turno) => {
            const horaInicioTurno =
              item.hora_inicio?.substring(0, 5) || "00:00";
            const horaFinTurno = item.hora_fin?.substring(0, 5) || "00:00";
            const fechaRealStr = (item as Turno & { fecha_real: string })
              .fecha_real;
            const minInicio = aMinutos(horaInicioTurno);
            let minFin = aMinutos(horaFinTurno);

            const esNocturno = minFin < minInicio;
            if (esNocturno) minFin += 24 * 60;

            const TOLERANCIA_MINS = 60;
            const limiteInferiorMins = minInicio - TOLERANCIA_MINS;
            const limiteSuperiorMins = minFin + TOLERANCIA_MINS;

            const marcajesDelDia = fichajesRealizados.filter(
              (fichaje: Record<string, any>) => {
                if (fichaje.estado?.localeCompare(EstadoFichaje.VALIDO) !== 0)
                  return false;
                const fechaFichajeStr = fichaje.fecha_hora.split("T")[0];
                if (fechaFichajeStr !== fechaRealStr) return false;

                // Comprobamos robustamente el código fijo (ENTRADA o SALIDA)
                const codigo = (
                  fichaje.codigo_evento ||
                  fichaje.tipo_evento_id ||
                  ""
                ).toUpperCase();
                const esEntrada = codigo === "ENTRADA";
                const esSalida = codigo === "SALIDA";

                if (!esEntrada && !esSalida) return false;

                let minsFichaje = obtenerMinutosFichaje(fichaje.fecha_hora);
                if (esNocturno && minsFichaje < limiteInferiorMins) {
                  minsFichaje += 24 * 60;
                }

                return (
                  minsFichaje >= limiteInferiorMins &&
                  minsFichaje <= limiteSuperiorMins
                );
              },
            );

            marcajesDelDia.sort(
              (a, b) =>
                new Date(a.fecha_hora).getTime() -
                new Date(b.fecha_hora).getTime(),
            );

            const pausasDelDia = fichajesRealizados.filter(
              (fichaje: Record<string, any>) => {
                if (fichaje.estado?.localeCompare(EstadoFichaje.VALIDO) !== 0)
                  return false;
                const fechaFichajeStr = fichaje.fecha_hora.split("T")[0];
                if (fechaFichajeStr !== fechaRealStr) return false;

                // Comprobamos el código fijo para las pausas
                const codigo = (
                  fichaje.codigo_evento ||
                  fichaje.tipo_evento_id ||
                  ""
                ).toUpperCase();
                const esPausa =
                  codigo === "INICIO_PAUSA" || codigo === "FIN_PAUSA";

                if (!esPausa) return false;

                let minsFichaje = obtenerMinutosFichaje(fichaje.fecha_hora);
                if (esNocturno && minsFichaje < limiteInferiorMins) {
                  minsFichaje += 24 * 60;
                }

                return (
                  minsFichaje >= limiteInferiorMins &&
                  minsFichaje <= limiteSuperiorMins
                );
              },
            );

            let minutosConsumidos = 0;
            const pausasOrdenadas = [...pausasDelDia].sort(
              (a, b) =>
                new Date(a.fecha_hora).getTime() -
                new Date(b.fecha_hora).getTime(),
            );

            let marcaInicioPausa: number | null = null;
            pausasOrdenadas.forEach((fichaje: Record<string, any>) => {
              const tMs = new Date(fichaje.fecha_hora).getTime();
              const codigo = (
                fichaje.codigo_evento ||
                fichaje.tipo_evento_id ||
                ""
              ).toUpperCase();

              if (codigo === "INICIO_PAUSA") {
                marcaInicioPausa = tMs;
              } else if (codigo === "FIN_PAUSA" && marcaInicioPausa !== null) {
                const diferenciaMinutos =
                  (tMs - marcaInicioPausa) / (1000 * 60);
                minutosConsumidos += Math.round(diferenciaMinutos);
                marcaInicioPausa = null;
              }
            });

            let minutosTrabajadosReales = 0;
            let marcaEntradaTurno: number | null = null;

            marcajesDelDia.forEach((fichaje: Record<string, any>) => {
              const tMs = new Date(fichaje.fecha_hora).getTime();
              const codigo = (
                fichaje.codigo_evento ||
                fichaje.tipo_evento_id ||
                ""
              ).toUpperCase();
              const esEntrada = codigo === "ENTRADA";

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
              minutosTeoricosTotales - (item?.duracion_pausa_minutos ?? 0),
            );

            const textoTrabajadoReal = formatearAHorasYMinutos(
              minutosTrabajadosReales,
            );
            const textoTrabajadoTeorico =
              formatearAHorasYMinutos(minutosTeoricosNetos);

            const [anioF, mesF, diaF] = fechaRealStr.split("-").map(Number);
            const fechaObjetoLocal = new Date(anioF, mesF - 1, diaF, 12, 0, 0);
            const diaSemanaIndex = fechaObjetoLocal.getDay();
            const nombreDiaStr =
              DIAS_SEMANA[diaSemanaIndex]?.toUpperCase() || "";

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
                          {nombreDiaStr}
                        </ThemedText>
                        <ThemedText style={styles.fechaSubtexto}>
                          {fechaRealStr}
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
                          {`${horaInicioTurno} a ${horaFinTurno}`}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.textoPausa}>
                        Descanso: {minutosConsumidos} /{" "}
                        {item?.duracion_pausa_minutos ?? 0} min.
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
                        {textoTrabajadoReal} / {textoTrabajadoTeorico}
                      </ThemedText>
                    </View>

                    {marcajesDelDia.length > 0 && (
                      <View style={styles.itemcontenedorFichajesReales}>
                        <View style={styles.separadorFichajes} />
                        <ThemedText style={styles.tituloFichajesSeccion}>
                          Marcajes en este turno:
                        </ThemedText>
                        {marcajesDelDia.map((fichaje: Record<string, any>) => {
                          const partes = fichaje.fecha_hora.split("T");
                          const horaLimpia = partes[1]
                            ? partes[1].substring(0, 5)
                            : "00:00";
                          const codigo = (
                            fichaje.codigo_evento ||
                            fichaje.tipo_evento_id ||
                            ""
                          ).toUpperCase();
                          const esEntrada = codigo === "ENTRADA";

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
