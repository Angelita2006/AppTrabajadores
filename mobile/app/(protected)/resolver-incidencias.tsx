import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

  // Filtros rápidos para el administrador (Opcional, mejora la UX)
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

  // Cargar las correcciones globales de la empresa asignada
  const cargarIncidenciasGlobales = useCallback(async () => {
    if (!empresaSeleccionada?.id) return;
    try {
      setCargando(true);
      const datosGlobales = await obtenerCorreccionesPorEmpresa(
        empresaSeleccionada.id,
      );

      await Promise.all(
        datosGlobales.map(async (incidencia) => {
          const trabajador: Trabajador = await obtenerTrabajador(
            incidencia.trabajador_id,
          );
          incidencia.trabajador_id =
            trabajador.nombre + " " + trabajador.apellidos;
        }),
      );
      setIncidencias(datosGlobales);
    } catch (error) {
      console.error("Error al cargar incidencias globales:", error);
      Alert.alert(
        "Error",
        "No se pudieron obtener las incidencias de la empresa.",
      );
    } finally {
      setCargando(false);
    }
  }, [empresaSeleccionada?.id]);

  useEffect(() => {
    cargarIncidenciasGlobales();
  }, [cargarIncidenciasGlobales]);

  // Resolución de incidencias (Aprobar / Rechazar)
  const handleResolverIncidencia = useCallback(
    async (idCorreccion: string, decision: "aprobada" | "rechazada") => {
      try {
        setCargando(true);
        if (!usuarioActual?.id) return;

        const resuelta = await resolverSolicitudCorreccion(
          idCorreccion,
          decision,
          usuarioActual.id,
        );

        setIncidencias((prev) =>
          prev.map((item) => (item.id === idCorreccion ? resuelta : item)),
        );

        Alert.alert(
          "Acción Procesada",
          `La incidencia ha sido marcada como ${decision} con éxito.`,
        );
      } catch (error: any) {
        const msg =
          error.response?.data?.detail ||
          "Fallo al interactuar con el servidor corporativo.";
        Alert.alert("Error de Red", msg);
      } finally {
        setCargando(false);
      }
    },
    [usuarioActual?.id],
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

  // Filtrado dinámico en base a la selección del Admin
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
      {/* Panel de Estadísticas */}
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

      {/* Selectores de visualización rápida para el Admin */}
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
              item.valor_nuevo && Object.keys(item.valor_nuevo).length > 0;
            const fechaD = item.valor_nuevo?.fecha_descuadre;
            const horaP = item.valor_nuevo?.hora_propuesta;
            const eventoS = item.valor_nuevo?.evento_solicitado;

            return (
              <Card key={item.id}>
                <View style={styles.itemCard}>
                  {/* Fila Superior: Tipo de corrección y Estado */}
                  <View style={styles.headerCard}>
                    <ThemedText style={styles.itemFecha}>
                      {item.tipo_correccion.replace("_", " ").toUpperCase()}
                    </ThemedText>
                    <View
                      style={[styles.badge, { backgroundColor: colores.bg }]}
                    >
                      <ThemedText
                        style={[styles.badgeText, { color: colores.texto }]}
                      >
                        {item.estado.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  {/* IDENTIFICADOR DEL TRABAJADOR (Esencial para el Admin) */}
                  <ThemedText style={styles.nombreTrabajador}>
                    👤 Trabajador: {item.trabajador_id}
                  </ThemedText>

                  {/* Detalles del Cambio */}
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
                    Motivo: "{item.motivo}"
                  </ThemedText>

                  {/* Panel Resolutor Directo */}
                  {item.estado === EstadoCorreccion.pendiente && (
                    <View style={styles.panelControlJefe}>
                      <Pressable
                        style={[styles.botonResolutor, styles.botonRechazar]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "rechazada")
                        }
                      >
                        <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          Rechazar
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        style={[styles.botonResolutor, styles.botonAprobar]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "aprobada")
                        }
                      >
                        <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          Aprobar
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
  textoBotonResolutor: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
