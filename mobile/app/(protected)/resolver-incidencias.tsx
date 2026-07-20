import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  EstadoCorreccion,
  IncidenciaResponse,
} from "../../src/modules/correcciones-fichaje/types/incidencia";
import {
  obtenerCorreccionesPorEmpresa,
  obtenerTrabajador,
  resolverSolicitudCorreccion,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

export default function AdminIncidenciasScreen() {
  const { usuarioActual, empresaSeleccionada } = useSesion();
  const [incidencias, setIncidencias] = useState<IncidenciaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<"todas" | "pendientes">(
    "pendientes",
  );

  const conteoEstados = useMemo(() => {
    const pendientes = incidencias.filter(
      (i) => i.estado === EstadoCorreccion.pendiente,
    ).length;
    const aprobadas = incidencias.filter(
      (i) => i.estado === EstadoCorreccion.aprobada,
    ).length;
    return { pendientes, aprobadas };
  }, [incidencias]);

  const cargarIncidenciasGlobales = useCallback(async () => {
    if (!empresaSeleccionada?.id) return;

    try {
      setCargando(true);

      const datosGlobales = await obtenerCorreccionesPorEmpresa(
        empresaSeleccionada.id,
      );

      const incidenciasConTrabajador = await Promise.all(
        datosGlobales.map(async (incidencia) => {
          try {
            const trabajador: Trabajador = await obtenerTrabajador(
              incidencia.trabajador_id,
            );

            return {
              ...incidencia,
              trabajador_id:
                `${trabajador?.nombre ?? ""} ${trabajador?.apellidos ?? ""}`.trim() ||
                incidencia.trabajador_id,
            };
          } catch {
            return incidencia;
          }
        }),
      );

      setIncidencias(incidenciasConTrabajador);
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error al cargar incidencias globales: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error de Carga", mensajeAmigable);
      }
    } finally {
      setCargando(false);
    }
  }, [empresaSeleccionada?.id]);

  useEffect(() => {
    cargarIncidenciasGlobales();
  }, [cargarIncidenciasGlobales]);

  const handleResolverIncidencia = useCallback(
    async (idCorreccion: string, decision: "Aprobada" | "Rechazada") => {
      // if (procesandoId) return;

      if (!usuarioActual?.id) {
        if (Platform.OS === "web") {
          alert("Sesión inválida: No se pudo identificar al usuario.");
        } else {
          Alert.alert("Sesión inválida", "No se pudo identificar al usuario.");
        }
        return;
      }

      setProcesandoId(idCorreccion);

      try {
        const resuelta = await resolverSolicitudCorreccion(
          idCorreccion,
          decision,
          usuarioActual.id,
        );

        const nuevoEstado =
          (resuelta?.estado as EstadoCorreccion | undefined) ??
          (decision === "Aprobada"
            ? EstadoCorreccion.aprobada
            : EstadoCorreccion.rechazada);

        setIncidencias((prev) =>
          prev.map((item) =>
            item.id === idCorreccion
              ? {
                  ...item,
                  ...(resuelta ?? {}),
                  estado: nuevoEstado,
                }
              : item,
          ),
        );

        if (Platform.OS === "web") {
          alert(
            `Acción procesada: La incidencia ha sido marcada como ${decision} con éxito.`,
          );
        } else {
          Alert.alert(
            "Acción procesada",
            `La incidencia ha sido marcada como ${decision} con éxito.`,
          );
        }
      } catch (error: any) {
        const mensajeAmigable = obtenerMensajeAmigableError(error);
        if (Platform.OS === "web") {
          alert(`Error de red: ${mensajeAmigable}`);
        } else {
          Alert.alert("Error de red", mensajeAmigable);
        }
      } finally {
        setProcesandoId(null);
      }
    },
    [procesandoId, usuarioActual?.id],
  );

  const getColoresEstado = (estado: EstadoCorreccion) => {
    switch (estado) {
      case EstadoCorreccion.aprobada:
        return { bg: "#DCFCE7", texto: "#16803D" };
      case EstadoCorreccion.rechazada:
        return { bg: "#FEE2E2", texto: "#B91C1C" };
      default:
        return { bg: "#FFEDD5", texto: "#D97706" };
    }
  };

  const incidenciasFiltradas = useMemo(() => {
    if (filtroEstado === "pendientes") {
      return incidencias.filter((i) => i.estado === EstadoCorreccion.pendiente);
    }
    return incidencias;
  }, [incidencias, filtroEstado]);

  return (
    <AppScreen
      title="Auditoría de Incidencias"
      subtitle={`Panel corporativo: ${empresaSeleccionada?.nombre_comercial ?? "Administrador Global"}`}
    >
      <Row>
        <StatCard
          label="Pendientes"
          value={conteoEstados.pendientes.toString()}
          tone="warning"
        />
        <StatCard
          label="Aprobadas"
          value={conteoEstados.aprobadas.toString()}
          tone="success"
        />
      </Row>

      <View style={styles.contenedorFiltros}>
        <Pressable
          style={[
            styles.miniBoton,
            filtroEstado === "pendientes" && styles.miniBotonActivo,
          ]}
          onPress={() => setFiltroEstado("pendientes")}
        >
          <ThemedText
            style={[
              styles.textoMiniBoton,
              filtroEstado === "pendientes" && styles.textoMiniBotonActivo,
            ]}
          >
            Ver Pendientes ({conteoEstados.pendientes})
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.miniBoton,
            filtroEstado === "todas" && styles.miniBotonActivo,
          ]}
          onPress={() => setFiltroEstado("todas")}
        >
          <ThemedText
            style={[
              styles.textoMiniBoton,
              filtroEstado === "todas" && styles.textoMiniBotonActivo,
            ]}
          >
            Ver Historial General
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.sectionTitle}>
        {filtroEstado === "pendientes"
          ? "Solicitudes Esperando Resolución"
          : "Historial de Incidencias de la Empresa"}
      </ThemedText>

      {cargando && incidencias.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#EA580C"
          style={{ marginTop: 24 }}
        />
      ) : incidenciasFiltradas.length === 0 ? (
        <ThemedText style={styles.empty}>
          No constan registros de incidencias en este apartado.
        </ThemedText>
      ) : (
        <View style={{ paddingBottom: 40 }}>
          {incidenciasFiltradas.map((item) => {
            const colores = getColoresEstado(item.estado);
            const tieneValoresNuevos =
              !!item.valor_nuevo && Object.keys(item.valor_nuevo).length > 0;
            const fechaD = item.valor_nuevo?.fecha_descuadre;
            const horaP = item.valor_nuevo?.hora_propuesta;
            const eventoS = item.valor_nuevo?.evento_solicitado;
            const tipoCorreccion =
              item.tipo_correccion?.replace(/_/g, " ").toUpperCase() ??
              "SIN TIPO";
            const isBusy = Boolean(procesandoId);
            const isCurrentItemProcessing = procesandoId === item.id;

            return (
              <Card key={item.id}>
                <View style={styles.itemCard}>
                  <View style={styles.headerCard}>
                    <ThemedText style={styles.itemFecha}>
                      {tipoCorreccion}
                    </ThemedText>

                    <View
                      style={[styles.badge, { backgroundColor: colores.bg }]}
                    >
                      <ThemedText
                        style={[styles.badgeText, { color: colores.texto }]}
                      >
                        {item.estado?.toUpperCase() ?? "PENDIENTE"}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.nombreTrabajador}>
                    👤 Trabajador: {item.trabajador_id ?? "Sin datos"}
                  </ThemedText>

                  {tieneValoresNuevos && fechaD && (
                    <ThemedText style={styles.itemTipo}>
                      🎯 Propuesta: {fechaD} a las {horaP ?? "00:00"} hs (
                      {eventoS?.toString().toUpperCase() ?? "N/A"})
                    </ThemedText>
                  )}

                  {item.valor_anterior?.hora_anterior && (
                    <ThemedText style={styles.itemIdAfectado}>
                      Hora original: {item.valor_anterior.hora_anterior} hs
                    </ThemedText>
                  )}

                  <ThemedText style={styles.itemMotivo}>
                    Motivo: "{item.motivo ?? "Sin motivo"}"
                  </ThemedText>

                  {item.estado === EstadoCorreccion.pendiente && (
                    <View style={styles.panelControlJefe}>
                      <Pressable
                        disabled={isBusy}
                        style={[
                          styles.botonResolutor,
                          styles.botonRechazar,
                          isBusy && styles.botonDeshabilitado,
                        ]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "Rechazada")
                        }
                      >
                        <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          {isCurrentItemProcessing
                            ? "Procesando..."
                            : "Rechazar"}
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        disabled={isBusy}
                        style={[
                          styles.botonResolutor,
                          styles.botonAprobar,
                          isBusy && styles.botonDeshabilitado,
                        ]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "Aprobada")
                        }
                      >
                        <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          {isCurrentItemProcessing
                            ? "Procesando..."
                            : "Aprobar"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contenedorFiltros: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  miniBoton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniBotonActivo: {
    backgroundColor: "#EA580C",
    borderColor: "#C2410C",
  },
  textoMiniBoton: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  textoMiniBotonActivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  itemCard: { width: "100%", paddingVertical: 4 },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemFecha: { fontSize: 13, fontWeight: "800", color: "#475569" },
  nombreTrabajador: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    padding: 6,
    borderRadius: 6,
  },
  itemIdAfectado: { fontSize: 12, color: "#64748B", marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  itemTipo: { fontSize: 13, color: "#1E293B", fontWeight: "600" },
  itemMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    fontStyle: "italic",
    lineHeight: 18,
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 24, fontSize: 14 },
  panelControlJefe: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  botonResolutor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
  },
  botonRechazar: { backgroundColor: "#DC2626" },
  botonAprobar: { backgroundColor: "#16A34A" },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonResolutor: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
