import {
  AusenciaCreateRequest,
  AusenciaResponse,
  EstadoAusencia,
  ItemAusencia,
  TipoAusencia,
} from "@/src/modules/ausencias/types/ausencia";
import { solicitarAusenciaOVacaciones } from "@/src/modules/trabajadores/api/services";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

// Interfaz local simulada para los trabajadores que el admin puede seleccionar
interface TrabajadorSimplificado {
  id: string;
  nombre: string;
}

export default function AdminVacacionesScreen() {
  const { empresaSeleccionada } = useSesion();
  const [solicitudes, setSolicitudes] = useState<ItemAusencia[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorSimplificado[]>(
    [],
  );
  const [cargando, setCargando] = useState(false);
  const [buscandoInicial, setBuscandoInicial] = useState(true);

  // Estados locales para ASIGNAR una ausencia a un trabajador específico
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("2026-07-01");
  const [fechaFin, setFechaFin] = useState("2026-07-15");
  const [motivo, setMotivo] = useState("");
  const [tipoAusencia, setTipoAusencia] = useState<TipoAusencia>(
    TipoAusencia.vacaciones,
  );

  // Carga global de datos para el Administrador
  const cargarDatosAdmin = async () => {
    if (!empresaSeleccionada?.id) {
      setBuscandoInicial(false);
      return;
    }

    try {
      setBuscandoInicial(true);

      // 1. Cargar todas las ausencias de la empresa (Reemplazar con tu endpoint real)
      // const todasLasAusencias = await obtenerAusenciasEmpresa(empresaSeleccionada.id);
      // setSolicitudes(todasLasAusencias || []);

      // 2. Cargar lista de trabajadores para el asignador (Reemplazar con tu endpoint real)
      // const listaTrabajadores = await obtenerTrabajadoresEmpresa(empresaSeleccionada.id);
      // setTrabajadores(listaTrabajadores || []);

      // Mock temporal para que compile perfectamente:
      setSolicitudes([]);
      setTrabajadores([
        { id: "emp-1", nombre: "Juan Pérez" },
        { id: "emp-2", nombre: "Ana Gómez" },
      ]);
    } catch (error) {
      console.error("Error cargando datos de administración:", error);
    } finally {
      setBuscandoInicial(false);
    }
  };

  useEffect(() => {
    cargarDatosAdmin();
  }, [empresaSeleccionada?.id]);

  // Métricas globales de la empresa
  const metricas = useMemo(() => {
    return {
      pendientes: solicitudes.filter(
        (s) => s.estado === EstadoAusencia.pendiente,
      ).length,
      aprobadas: solicitudes.filter((s) => s.estado === EstadoAusencia.aprobado)
        .length,
      rechazadas: solicitudes.filter(
        (s) => s.estado === EstadoAusencia.rechazado,
      ).length,
    };
  }, [solicitudes]);

  // Acción 1: Cambiar estado (Aprobar / Rechazar)
  const manejarResolucion = async (
    ausenciaId: string,
    nuevoEstado: EstadoAusencia,
  ) => {
    try {
      setCargando(true);
      // Llamada a tu API para actualizar el estado de la fila
      // await actualizarEstadoAusencia(ausenciaId, nuevoEstado);

      // Actualizar el estado en la interfaz localmente
      setSolicitudes((prev) =>
        prev.map((solicitud) =>
          solicitud.id === ausenciaId
            ? { ...solicitud, estado: nuevoEstado }
            : solicitud,
        ),
      );

      Alert.alert(
        "Éxito",
        `Solicitud ${nuevoEstado === EstadoAusencia.aprobado ? "aprobada" : "rechazada"} correctamente.`,
      );
    } catch {
      Alert.alert("Error", "No se pudo actualizar el estado de la solicitud.");
    } finally {
      setCargando(false);
    }
  };

  // Acción 2: Asignar directamente vacaciones/ausencias a un empleado
  const asignarAusenciaDirecta = async () => {
    if (!trabajadorSeleccionadoId) {
      Alert.alert(
        "Formulario incompleto",
        "Por favor, selecciona un trabajador.",
      );
      return;
    }
    if (!motivo.trim()) {
      Alert.alert(
        "Formulario incompleto",
        "Por favor, escribe el motivo de la asignación.",
      );
      return;
    }

    try {
      setCargando(true);

      const payload: AusenciaCreateRequest = {
        trabajador_id: trabajadorSeleccionadoId,
        empresa_id: empresaSeleccionada!.id,
        tipo_ausencia: tipoAusencia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo: `[Asignado por Admin] ${motivo}`,
        justificante_metadata: {},
      };

      // Reutiliza tu servicio de creación pasándole el ID del empleado elegido
      const respuestaBackend: AusenciaResponse =
        await solicitarAusenciaOVacaciones(payload);

      const nueva: ItemAusencia = {
        id: respuestaBackend.id,
        tipo_ausencia: respuestaBackend.tipo_ausencia,
        estado: EstadoAusencia.aprobado, // Al ser asignado por el admin, nace aprobado directamente
        fecha_inicio: respuestaBackend.fecha_inicio,
        fecha_fin: respuestaBackend.fecha_fin,
        motivo: respuestaBackend.motivo,
      };

      setSolicitudes([nueva, ...solicitudes]);
      setMotivo("");
      setTrabajadorSeleccionadoId("");
      Alert.alert(
        "Asignación Correcta",
        "El periodo se ha registrado y aprobado automáticamente.",
      );
    } catch {
      Alert.alert("Error", "No se pudo guardar la asignación directa.");
    } finally {
      setCargando(false);
    }
  };

  const listaTiposAusencia: TipoAusencia[] = [
    TipoAusencia.vacaciones,
    TipoAusencia.baja_temporal,
    TipoAusencia.maternidad_paternidad,
    TipoAusencia.permiso_retribuido,
    TipoAusencia.ausencia_injustificada,
  ];

  return (
    <AppScreen
      title="Panel de Control: Vacaciones"
      subtitle="Revisa peticiones de tu equipo o asigna días de vacaciones directamente."
    >
      {/* Kpis Globales de Gestión */}
      <Row>
        <StatCard
          label="Por Revisar"
          value={metricas.pendientes.toString()}
          tone="warning"
        />
        <StatCard
          label="Aprobadas"
          value={metricas.aprobadas.toString()}
          tone="success"
        />
        <StatCard label="Rechazadas" value={metricas.rechazadas.toString()} />
      </Row>

      {/* Sección 1: Crear / Asignar directamente a un empleado */}
      <ThemedText style={styles.sectionTitle}>
        Asignar Ausencia / Vacaciones
      </ThemedText>
      <Card>
        <View style={styles.contenedorFormulario}>
          {/* Selector de Empleados */}
          <ThemedText style={styles.label}>
            1. Seleccionar Trabajador
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Atributo nativo exclusivo para Android que suaviza los cortes visuales en los bordes
            fadingEdgeLength={25}
            // Obliga a que los elementos internos no se queden pegados al inicio/final del scroll
            contentContainerStyle={[
              styles.selectorTrabajadoresContainer,
              { paddingHorizontal: 16 },
            ]}
            style={styles.selectorTrabajadores}
          >
            {trabajadores.map((t) => (
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
                  {t.nombre}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Selector de Tipos */}
          <ThemedText style={styles.label}>2. Tipo de Ausencia</ThemedText>
          <View style={styles.selectorTipos}>
            {listaTiposAusencia.map((tipo) => (
              <Pressable
                key={tipo}
                style={[
                  styles.opcionTipo,
                  tipoAusencia === tipo && styles.opcionTipoActiva,
                ]}
                onPress={() => setTipoAusencia(tipo)}
              >
                <ThemedText
                  style={[
                    styles.textoOpcion,
                    tipoAusencia === tipo && styles.textoOpcionActiva,
                  ]}
                >
                  {tipo.replace(/_/g, " ").toUpperCase()}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Fechas */}
          <View style={styles.filaFechas}>
            <View style={styles.columnaFecha}>
              <ThemedText style={styles.label}>Fecha Inicio</ThemedText>
              <TextInput
                value={fechaInicio}
                onChangeText={setFechaInicio}
                style={styles.input}
                placeholder="AAAA-MM-DD"
              />
            </View>
            <View style={styles.columnaFecha}>
              <ThemedText style={styles.label}>Fecha Fin</ThemedText>
              <TextInput
                value={fechaFin}
                onChangeText={setFechaFin}
                style={styles.input}
                placeholder="AAAA-MM-DD"
              />
            </View>
          </View>

          {/* Justificación */}
          <ThemedText style={styles.label}>Notas / Motivo Interno</ThemedText>
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            style={[styles.input, styles.textArea]}
            multiline
            placeholder="Introduce las razones del ajuste o notas de aprobación..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        <Pressable
          style={[styles.submitButton, cargando && styles.buttonDisabled]}
          onPress={asignarAusenciaDirecta}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitText}>
              Asignar y Aprobar Días
            </ThemedText>
          )}
        </Pressable>
      </Card>

      {/* Sección 2: Cola de Aprobación de Solicitudes */}
      <ThemedText style={styles.sectionTitle}>
        Solicitudes del Personal
      </ThemedText>

      {buscandoInicial ? (
        <ActivityIndicator
          size="small"
          color="#2563EB"
          style={{ marginTop: 12 }}
        />
      ) : solicitudes.length === 0 ? (
        <ThemedText style={styles.empty}>
          No hay peticiones registradas en la empresa.
        </ThemedText>
      ) : (
        <View style={{ paddingBottom: 32 }}>
          {solicitudes.map((item) => (
            <Card key={item.id}>
              <View style={styles.solicitudItem}>
                <View style={styles.solicitudHeader}>
                  <View>
                    <ThemedText style={styles.solicitudTipo}>
                      {item.tipo_ausencia.replace(/_/g, " ").toUpperCase()}
                    </ThemedText>
                    {/* Nota: Si tu backend devuelve el nombre del empleado en ItemAusencia, renderízalo aquí */}
                    <ThemedText style={styles.solicitudEmpleado}>
                      Solicitado por ID: {item.id}
                    </ThemedText>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      item.estado === EstadoAusencia.aprobado
                        ? styles.badgeAprobado
                        : item.estado === EstadoAusencia.pendiente
                          ? styles.badgePendiente
                          : styles.badgeRechazado,
                    ]}
                  >
                    <ThemedText style={styles.badgeText}>
                      {item.estado.toUpperCase()}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.solicitudFechas}>
                  Periodo: {item.fecha_inicio} al {item.fecha_fin}
                </ThemedText>

                <ThemedText style={styles.solicitudMotivo}>
                  {item.motivo}
                </ThemedText>

                {/* BOTONES DE ACCIÓN PARA EL ADMIN: Sólo visibles si está Pendiente */}
                {item.estado === EstadoAusencia.pendiente && (
                  <View style={styles.contenedorAcciones}>
                    <Pressable
                      style={[styles.botonAccion, styles.botonRechazar]}
                      onPress={() =>
                        manejarResolucion(item.id, EstadoAusencia.rechazado)
                      }
                      disabled={cargando}
                    >
                      <ThemedText style={styles.textoBotonAccion}>
                        Rechazar
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.botonAccion, styles.botonAprobar]}
                      onPress={() =>
                        manejarResolucion(item.id, EstadoAusencia.aprobado)
                      }
                      disabled={cargando}
                    >
                      <ThemedText style={styles.textoBotonAccion}>
                        Aprobar
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  selectorTrabajadores: {
    // El componente padre solo define su espacio vertical, NO uses flex: 1 aquí
    maxHeight: 60,
    height: 60,
  },
  selectorTrabajadoresContainer: {
    // El contenedor interno se encarga de alinear los hijos en fila
    flexDirection: "row",
    alignItems: "center", // Centra verticalmente los botones dentro del ScrollView
  },
  opcionTrabajador: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8, // Margen derecho para separar los chips
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  contenedorFormulario: { padding: 4, width: "100%" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  opcionTrabajadorActiva: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  textoTrabajador: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  textoTrabajadorActiva: { color: "#065F46", fontWeight: "700" },

  selectorTipos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  opcionTipo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  opcionTipoActiva: { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" },
  textoOpcion: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  textoOpcionActiva: { color: "#1E40AF", fontSize: 11, fontWeight: "700" },

  filaFechas: { flexDirection: "row", gap: 12, marginBottom: 14 },
  columnaFecha: { flex: 1 },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 60,
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
  buttonDisabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  solicitudItem: { width: "100%", paddingVertical: 4 },
  solicitudHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  solicitudTipo: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  solicitudEmpleado: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeAprobado: { backgroundColor: "#DCFCE7" },
  badgePendiente: { backgroundColor: "#FEF3C7" },
  badgeRechazado: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#374151" },
  solicitudFechas: { fontSize: 13, color: "#475569", fontWeight: "600" },
  solicitudMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 10, fontSize: 14 },

  contenedorAcciones: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  botonAccion: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  botonRechazar: { backgroundColor: "#EF4444" },
  botonAprobar: { backgroundColor: "#2563EB" },
  textoBotonAccion: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
