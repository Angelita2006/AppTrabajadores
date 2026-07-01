import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import {
  obtenerAsignacionesTurnoTrabajador,
  obtenerFichajesSemanaActual,
} from "@/src/modules/trabajadores/api/services";
import { useSesion } from "@/src/modules/trabajadores/store/SesionContext";
import { obtenerTurno } from "@/src/modules/turnos/services/services";
import { ItemTurno, Turno } from "@/src/modules/turnos/types/turno";
import { ThemedText } from "@/src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/src/shared/ui/AppSurface";
import { IconSymbol } from "@/src/shared/ui/icon-symbol";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

// Interfaz corregida con el campo "estado" para el filtrado seguro
interface RegistroFichaje {
  id: string;
  fecha_hora: string;
  tipo_evento: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  estado?: string;
}

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

        // 2. Descargamos el historial de marcajes y forzamos el casteo para evitar el error ts(2322)
        const todosLosFichajes = await obtenerFichajesSemanaActual(
          usuarioActual!.trabajador_id,
        );

        // Mapeamos para asegurarnos de que "tipo_evento" sea un string plano compatible
        const fichajesFormateados: RegistroFichaje[] = todosLosFichajes.map(
          (f: any) => ({
            id: f.id,
            fecha_hora: f.fecha_hora,
            tipo_evento: String(f.tipo_evento) as
              | "ENTRADA"
              | "SALIDA"
              | "INICIO_PAUSA"
              | "FIN_PAUSA",
            estado: f.estado,
          }),
        );

        setFichajesRealizados(fichajesFormateados);

        let turnos: ItemTurno[] = [];

        for (const asignacion_turno of asignaciones) {
          if (
            asignacion_turno.fecha_fin !== null &&
            asignacion_turno.fecha_fin !== undefined
          ) {
            const fecha_inicio = new Date(asignacion_turno.fecha_inicio);
            const fecha_fin = new Date(asignacion_turno.fecha_fin);

            const diferenciaMilisegundos =
              fecha_fin.getTime() - fecha_inicio.getTime();
            const dias_asignados = Math.floor(
              diferenciaMilisegundos / (1000 * 60 * 60 * 24),
            );

            const turno: Turno = await obtenerTurno(asignacion_turno.turno_id);
            let fechaCursor = new Date(fecha_inicio);

            for (let i = 0; i <= dias_asignados; i++) {
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
              };

              turnos.push(itemTurno);
              fechaCursor.setDate(fechaCursor.getDate() + 1);
            }
          }
        }

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
          {cuadrante.map((item) => {
            // 1. OBTENER INFORMACIÓN HORARIA BASE DEL TURNO
            const [añoT, mesT, diaT] = item.fecha_real.split("-").map(Number);
            const [hIn, mIn] = item.hora_inicio.split(":").map(Number);
            const [hFi, mFi] = item.hora_fin.split(":").map(Number);

            const fechaInicioTurno = new Date(
              añoT,
              mesT - 1,
              diaT,
              hIn,
              mIn,
              0,
            );
            const fechaFinTurno = new Date(añoT, mesT - 1, diaT, hFi, mFi, 0);

            // Ajuste automático por si el turno cruza la medianoche (nocturnos)
            if (fechaFinTurno < fechaInicioTurno) {
              fechaFinTurno.setDate(fechaFinTurno.getDate() + 1);
            }

            // Ventana de tolerancia extendida a 4 horas para captar cualquier marcaje temprano/tardío
            const margenToleranciaMs = 4 * 60 * 60 * 1000;
            const margenInicio =
              fechaInicioTurno.getTime() - margenToleranciaMs;
            const margenFin = fechaFinTurno.getTime() + margenToleranciaMs;

            // 2. FILTRADO FILTRADO DE MARCAJES DE ENTRADA Y SALIDA (SÓLO VALIDOS)
            const marcajesDelDia = fichajesRealizados.filter((fichaje) => {
              // Filtrado por validez
              if (fichaje.estado?.toLowerCase() !== "valido") return false;

              const esEntradaOSalida =
                fichaje.tipo_evento === "ENTRADA" ||
                fichaje.tipo_evento === "SALIDA";

              if (!esEntradaOSalida) return false;

              // Comprobación de ventana de tiempo exacta por timestamp
              const tiempoFichajeMs = new Date(fichaje.fecha_hora).getTime();
              return (
                tiempoFichajeMs >= margenInicio && tiempoFichajeMs <= margenFin
              );
            });

            // 3. FILTRADO DE EVENTOS DE DESCANSO (SÓLO VALIDOS)
            const pausasDelDia = fichajesRealizados.filter((fichaje) => {
              // Filtrado por validez
              if (fichaje.estado?.toLowerCase() !== "valido") return false;

              const esPausa =
                fichaje.tipo_evento === "INICIO_PAUSA" ||
                fichaje.tipo_evento === "FIN_PAUSA";

              if (!esPausa) return false;

              // Comprobación de ventana de tiempo exacta por timestamp
              const tiempoFichajeMs = new Date(fichaje.fecha_hora).getTime();
              return (
                tiempoFichajeMs >= margenInicio && tiempoFichajeMs <= margenFin
              );
            });

            // 4. ALGORITMO DE EMPAREJAMIENTO CRONOLÓGICO PARA CALCULAR MINUTOS DE PAUSA
            let minutosConsumidos = 0;
            const pausasOrdenadas = [...pausasDelDia].sort(
              (a, b) =>
                new Date(a.fecha_hora).getTime() -
                new Date(b.fecha_hora).getTime(),
            );

            let marcaInicioPausa: number | null = null;

            pausasOrdenadas.forEach((fichaje) => {
              const tMs = new Date(fichaje.fecha_hora).getTime();

              if (fichaje.tipo_evento === "INICIO_PAUSA") {
                marcaInicioPausa = tMs;
              } else if (
                fichaje.tipo_evento === "FIN_PAUSA" &&
                marcaInicioPausa !== null
              ) {
                const diferenciaMinutos =
                  (tMs - marcaInicioPausa) / (1000 * 60);
                minutosConsumidos += Math.round(diferenciaMinutos);
                marcaInicioPausa = null;
              }
            });

            // 5. CALCULAR TIEMPO REAL TRABAJADO EN ESTE TURNO (EN MINUTOS)
            let minutosTrabajadosReales = 0;
            const marcajesOrdenados = [...marcajesDelDia].sort(
              (a, b) =>
                new Date(a.fecha_hora).getTime() -
                new Date(b.fecha_hora).getTime(),
            );

            let marcaEntradaTurno: number | null = null;

            marcajesOrdenados.forEach((fichaje) => {
              const tMs = new Date(fichaje.fecha_hora).getTime();

              if (fichaje.tipo_evento === "ENTRADA") {
                marcaEntradaTurno = tMs;
              } else if (
                fichaje.tipo_evento === "SALIDA" &&
                marcaEntradaTurno !== null
              ) {
                minutosTrabajadosReales +=
                  (tMs - marcaEntradaTurno) / (1000 * 60);
                marcaEntradaTurno = null;
              }
            });

            // Restamos los descansos tomados para que las horas netas trabajadas sean reales
            minutosTrabajadosReales = Math.max(
              0,
              Math.round(minutosTrabajadosReales - minutosConsumidos),
            );

            // 6. CALCULAR TIEMPO TEÓRICO COMPLETO QUE HABÍA QUE TRABAJAR
            let minutosTeoricosTotales =
              (fechaFinTurno.getTime() - fechaInicioTurno.getTime()) /
              (1000 * 60);

            // Descontamos la pausa obligatoria del contrato para saber las horas netas a trabajar
            const minutosTeoricosNetos = Math.max(
              0,
              minutosTeoricosTotales - (item?.minutos_pausa_obligatoria ?? 0),
            );

            // Funciones auxiliares para formatear los minutos a formato legible "Xh Ymin"
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

                    {/* RENDREIZADO DE MARCAJES VALIDOS */}
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
                          const esEntrada = fichaje.tipo_evento === "ENTRADA";

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
  barraColor: {
    width: 5,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  cuerpoTarjeta: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  headerTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombreTurno: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
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
  itemHora: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  textoHoras: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  textoPausa: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 24,
    lineHeight: 20,
  },
  itemcontenedorFichajesReales: {
    marginTop: 10,
  },
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
  textoFichajeItem: {
    fontSize: 12,
    fontWeight: "500",
  },
});
