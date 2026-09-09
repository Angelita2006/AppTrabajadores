import { obtenerTrabajadoresEmpresa } from "@/src/modules/empresas/api/services";
import { obtenerRolPorId } from "@/src/modules/roles/api/services";
import { obtenerTrabajador } from "@/src/modules/trabajadores/api/services";
import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import {
  obtenerAusenciasEmpresa,
  resolverSolicitudAusencia,
  solicitarAusencia,
} from "@/src/modules/vacaciones/api/services";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/usuarios/store/SesionContext";
import {
  AusenciaCreateRequest,
  AusenciaResponse,
  EstadoAusencia,
  ItemAusencia,
  TipoAusencia,
  TIPOS_AUSENCIA,
} from "../../src/modules/vacaciones/types/ausencia";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row } from "../../src/shared/ui/AppSurface";

export default function GestionAusenciasScreen() {
  const { usuarioActual, empresaActual } = useSesion();
  const [ausencias, setAusencias] = useState<AusenciaResponse[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] =
    useState<string>("");

  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<"todas" | "pendientes">(
    "pendientes",
  );

  // Form states
  const [tipoAusencia, setTipoAusencia] = useState<TipoAusencia>("Vacaciones");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [comentario, setComentario] = useState("");

  const conteoEstados = useMemo(() => {
    const pendientes = ausencias.filter((i) => i.estado === "Pendiente").length;
    const aprobadas = ausencias.filter((i) => i.estado === "Aprobada").length;
    const rechazadas = ausencias.filter((i) => i.estado === "Rechazada").length;
    return { pendientes, aprobadas, rechazadas };
  }, [ausencias]);

  // Cargar lista de trabajadores de la empresa para el selector de RRHH
  useEffect(() => {
    async function cargarTrabajadores() {
      if (!empresaActual?.id) return;
      try {
        const lista = await obtenerTrabajadoresEmpresa(empresaActual.id);
        if (Array.isArray(lista)) {
          const trabajadoresFiltrados = (
            await Promise.all(
              lista.map(async (t: Trabajador) => {
                if (!t.rol_id) return t; // Si no tiene rol, se mantiene
                try {
                  const rol = await obtenerRolPorId(t.rol_id);
                  // Comprueba si el rol corresponde a un administrador
                  const esAdmin =
                    rol?.nombre.toLowerCase() == "admin_empresa" ||
                    rol?.nombre.toLowerCase() == "admin_gestoría";

                  return esAdmin ? null : t;
                } catch {
                  return t;
                }
              }),
            )
          ).filter(Boolean) as Trabajador[];

          setTrabajadores(trabajadoresFiltrados);
          if (trabajadoresFiltrados.length > 0 && !trabajadorSeleccionadoId) {
            setTrabajadorSeleccionadoId(trabajadoresFiltrados[0].id);
          }
        }
      } catch (error: any) {
        mostrarError(
          "Error al cargar la lista de trabajadores de la empresa: " + error,
        );
      }
    }
    cargarTrabajadores();
  }, [empresaActual?.id]);

  const cargarDatosGlobalesYPersonales = useCallback(async () => {
    if (!empresaActual?.id) {
      setCargando(false);
      return;
    }

    try {
      setCargando(true);

      const datosGlobales = await obtenerAusenciasEmpresa(empresaActual.id);
      const ausenciasConTrabajador = await Promise.all(
        (datosGlobales || []).map(async (ausencia: ItemAusencia) => {
          try {
            const trabajador: Trabajador = await obtenerTrabajador(
              ausencia.trabajador_id,
            );
            return {
              ...ausencia,
              trabajador_id:
                `${trabajador?.nombre ?? ""} ${trabajador?.apellidos ?? ""}`.trim() ||
                ausencia.trabajador_id,
            };
          } catch {
            return ausencia;
          }
        }),
      );

      setAusencias(ausenciasConTrabajador as AusenciaResponse[]);
    } catch (error: any) {
      mostrarError("Error al cargar las ausencias de la empresa: " + error);
    } finally {
      setCargando(false);
    }
  }, [empresaActual?.id]);

  useEffect(() => {
    cargarDatosGlobalesYPersonales();
  }, [cargarDatosGlobalesYPersonales]);

  const reportarAusencia = useCallback(async () => {
    if (!trabajadorSeleccionadoId) {
      mostrarMensaje(
        "Aviso",
        "Por favor, selecciona un trabajador al que aplicar la ausencia.",
      );
      return;
    }
    if (!tipoAusencia) {
      mostrarMensaje("Aviso", "Por favor, selecciona un tipo de ausencia.");
      return;
    }
    if (!fechaInicio.trim() || !fechaFin.trim()) {
      mostrarMensaje("Aviso", "Por favor, indica la fecha de inicio y de fin.");
      return;
    }
    if (!comentario.trim()) {
      mostrarMensaje("Aviso", "Por favor, especifica el motivo o explicación.");
      return;
    }

    try {
      setCargando(true);
      if (!empresaActual?.id) return;

      const payload: AusenciaCreateRequest = {
        empresa_id: empresaActual.id,
        trabajador_id: trabajadorSeleccionadoId,
        tipo_ausencia: tipoAusencia,
        fecha_inicio: fechaInicio.trim(),
        fecha_fin: fechaFin.trim(),
        motivo: comentario.trim(),
      };

      const respuestaBackend = await solicitarAusencia(payload);
      setAusencias((prev) => [respuestaBackend, ...prev]);
      setComentario("");
      setFechaInicio("");
      setFechaFin("");
    } catch (error: any) {
      mostrarError("Error al solicitar o asignar la ausencia: " + error);
    } finally {
      setCargando(false);
    }
  }, [
    comentario,
    tipoAusencia,
    fechaInicio,
    fechaFin,
    trabajadorSeleccionadoId,
    empresaActual,
  ]);

  const handleResolverAusencia = useCallback(
    async (idAusencia: string, decision: EstadoAusencia) => {
      if (!usuarioActual?.id) return;
      setProcesandoId(idAusencia);
      try {
        const resuelta = await resolverSolicitudAusencia(
          idAusencia,
          decision,
          usuarioActual.id,
        );
        const nuevoEstado = resuelta?.estado ?? decision;
        setAusencias((prev) =>
          prev.map((item) =>
            item.id === idAusencia
              ? { ...item, ...resuelta, estado: nuevoEstado }
              : item,
          ),
        );
      } catch (error: any) {
        mostrarError(
          "Error al resolver la solicitud de ausencia (" +
            decision +
            "): " +
            error,
        );
      } finally {
        setProcesandoId(null);
      }
    },
    [usuarioActual?.id],
  );

  const getColoresEstado = (estado: EstadoAusencia) => {
    switch (estado) {
      case "Aprobada":
        return { bg: "#DCFCE7", texto: "#16803D" };
      case "Rechazada":
        return { bg: "#FEE2E2", texto: "#B91C1C" };
      default:
        return { bg: "#EFF6FF", texto: "#1D4ED8" };
    }
  };

  const listaFiltrada = useMemo(() => {
    if (filtroEstado === "pendientes") {
      return ausencias.filter((i) => i.estado === "Pendiente");
    }
    return ausencias;
  }, [ausencias, filtroEstado]);

  return (
    <AppScreen
      title="Gestión de Ausencias"
      subtitle={`Panel integral de administración: ${empresaActual?.nombre_comercial ?? "Global"}`}
    >
      <Row>
        <View
          style={[
            styles.statCardContainer,
            { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
          ]}
        >
          <ThemedText style={styles.statLabel}>POR REVISAR</ThemedText>
          <ThemedText style={[styles.statValue, { color: "#1D4ED8" }]}>
            {conteoEstados.pendientes}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statCardContainer,
            { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
          ]}
        >
          <ThemedText style={styles.statLabel}>APROBADAS</ThemedText>
          <ThemedText style={[styles.statValue, { color: "#16A34A" }]}>
            {conteoEstados.aprobadas}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statCardContainer,
            { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
          ]}
        >
          <ThemedText style={styles.statLabel}>RECHAZADAS</ThemedText>
          <ThemedText style={[styles.statValue, { color: "#DC2626" }]}>
            {conteoEstados.rechazadas}
          </ThemedText>
        </View>
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
            Pendientes ({conteoEstados.pendientes})
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
            Historial General
          </ThemedText>
        </Pressable>
      </View>

      {filtroEstado === "pendientes" && (
        <>
          <ThemedText style={styles.sectionTitle}>
            Asignar Ausencia / Vacaciones
          </ThemedText>
          <Card>
            <View style={styles.contenedorForm}>
              {/* Selector de Trabajador */}
              <ThemedText style={styles.label}>
                1. Seleccionar Trabajador
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
                style={{ marginBottom: 12 }}
              >
                {trabajadores.map((t: Trabajador) => (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.opcionTrabajador,
                      trabajadorSeleccionadoId === t.id &&
                        styles.opcionTrabajadorActiva,
                    ]}
                    onPress={() => setTrabajadorSeleccionadoId(t.id)}
                  >
                    <ThemedText
                      style={[
                        styles.textoTrabajador,
                        trabajadorSeleccionadoId === t.id &&
                          styles.textoTrabajadorActiva,
                      ]}
                    >
                      {t.nombre} {t.apellidos ?? ""}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <ThemedText style={styles.label}>2. Tipo de Ausencia</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
                style={{ marginBottom: 12 }}
              >
                {Object.values(TIPOS_AUSENCIA).map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[
                      styles.opcionTrabajador,
                      tipoAusencia === tipo && styles.opcionTrabajadorActiva,
                    ]}
                    onPress={() => setTipoAusencia(tipo)}
                  >
                    <ThemedText
                      style={[
                        styles.textoTrabajador,
                        tipoAusencia === tipo && styles.textoTrabajadorActiva,
                      ]}
                    >
                      {tipo.replace(/_/g, " ")}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.filaCampos}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.label}>Fecha Inicio</ThemedText>
                  <TextInput
                    value={fechaInicio}
                    onChangeText={setFechaInicio}
                    style={styles.input}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.label}>Fecha Fin</ThemedText>
                  <TextInput
                    value={fechaFin}
                    onChangeText={setFechaFin}
                    style={styles.input}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <ThemedText style={styles.label}>
                Notas / Motivo Interno
              </ThemedText>
              <TextInput
                value={comentario}
                onChangeText={setComentario}
                style={[styles.input, styles.textArea]}
                placeholder="Introduce las razones del ajuste o notas de aprobación..."
                placeholderTextColor="#94A3B8"
                maxLength={250}
              />
            </View>
            <Pressable
              style={[styles.submitButton, cargando && styles.disabled]}
              onPress={reportarAusencia}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitText}>Asignar Días</ThemedText>
              )}
            </Pressable>
          </Card>
        </>
      )}

      <ThemedText style={styles.sectionTitle}>
        Auditoría y Resolución de Solicitudes
      </ThemedText>

      {cargando && ausencias.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 24 }}
        />
      ) : listaFiltrada.length === 0 ? (
        <ThemedText style={styles.empty}>
          No constan registros en este apartado.
        </ThemedText>
      ) : (
        <View style={{ paddingBottom: 40 }}>
          {listaFiltrada.map((item) => {
            const colores = getColoresEstado(item.estado);
            const isBusy = procesandoId !== null;
            const isCurrentProcessing = procesandoId === item.id;

            return (
              <Card key={item.id}>
                <View style={styles.itemCard}>
                  <View style={styles.headerCard}>
                    <ThemedText style={styles.itemFecha}>
                      {item.fecha_inicio} al {item.fecha_fin}
                    </ThemedText>
                    <View
                      style={[styles.badge, { backgroundColor: colores.bg }]}
                    >
                      <ThemedText
                        style={[styles.badgeText, { color: colores.texto }]}
                      >
                        {(item.estado || "").toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.nombreTrabajador}>
                    👤 Trabajador: {item.trabajador_id ?? "N/A"}
                  </ThemedText>
                  <ThemedText style={styles.itemTipo}>
                    Tipo: {item.tipo_ausencia?.replace(/_/g, " ")}
                  </ThemedText>
                  <ThemedText style={styles.itemMotivo}>
                    Motivo: "{item.motivo}"
                  </ThemedText>

                  {item.estado === "Pendiente" && (
                    <View style={styles.panelControlJefe}>
                      <Pressable
                        disabled={isBusy}
                        style={[
                          styles.botonResolutor,
                          styles.botonRechazar,
                          isBusy && styles.disabled,
                        ]}
                        onPress={() =>
                          handleResolverAusencia(item.id, "Rechazada")
                        }
                      >
                        <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          {isCurrentProcessing ? "Procesando..." : "Rechazar"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        disabled={isBusy}
                        style={[
                          styles.botonResolutor,
                          styles.botonAprobar,
                          isBusy && styles.disabled,
                        ]}
                        onPress={() =>
                          handleResolverAusencia(item.id, "Aprobada")
                        }
                      >
                        <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          {isCurrentProcessing ? "Procesando..." : "Aprobar"}
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
  },
  statCardContainer: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
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
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniBotonActivo: { backgroundColor: "#2563EB", borderColor: "#1D4ED8" },
  textoMiniBoton: { fontSize: 12, color: "#475569", fontWeight: "600" },
  textoMiniBotonActivo: { color: "#FFFFFF", fontWeight: "700" },
  contenedorForm: { padding: 4, width: "100%" },
  filaCampos: { flexDirection: "row", gap: 12, marginBottom: 4 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  opcionTrabajador: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  opcionTrabajadorActiva: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  textoTrabajador: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  textoTrabajadorActiva: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "700",
  },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: "top",
    paddingTop: 10,
    marginBottom: 16,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#10B981",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
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
  itemTipo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  itemMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    fontStyle: "italic",
    lineHeight: 18,
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 24, fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  panelControlJefe: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
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
