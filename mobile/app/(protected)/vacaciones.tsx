import {
  AusenciaCreateRequest,
  AusenciaResponse,
  EstadoAusencia,
  ItemAusencia,
  TipoAusencia,
} from "@/src/modules/ausencias/types/ausencia";
import {
  obtenerAusenciasYVacacionesTrabajador,
  solicitarAusenciaOVacaciones,
} from "@/src/modules/trabajadores/api/services";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

export default function VacacionesScreen() {
  const { usuarioActual, trabajadorActual, empresaSeleccionada } = useSesion();
  const [solicitudes, setSolicitudes] = useState<ItemAusencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscandoInicial, setBuscandoInicial] = useState(true);

  // Estados locales para el formulario
  const [fechaInicio, setFechaInicio] = useState("2026-07-01");
  const [fechaFin, setFechaFin] = useState("2026-07-15");
  const [motivo, setMotivo] = useState("");
  const [tipoAusencia, setTipoAusencia] = useState<TipoAusencia>(
    "Vacaciones" as TipoAusencia,
  );

  // Carga histórica de ausencias
  const cargarHistoricoAusencias = async () => {
    if (!trabajadorActual?.id) {
      setBuscandoInicial(false);
      return;
    }

    try {
      setBuscandoInicial(true);
      const ausenciasTrabajador: ItemAusencia[] =
        await obtenerAusenciasYVacacionesTrabajador(trabajadorActual.id);
      setSolicitudes(ausenciasTrabajador || []);
    } catch (error) {
      console.error("Error cargando ausencias:", error);
    } finally {
      setBuscandoInicial(false);
    }
  };

  useEffect(() => {
    cargarHistoricoAusencias();
  }, [trabajadorActual?.id]);

  // Cálculo dinámico del total de días reales acumulados de todas las solicitudes
  const totalDiasSolicitados = useMemo(() => {
    return solicitudes.reduce((acumulador, item) => {
      const inicio = new Date(item.fecha_inicio);
      const fin = new Date(item.fecha_fin);

      // Calcular la diferencia en milisegundos y pasar a días (+1 para incluir el día de inicio)
      const diferenciaTiempo = fin.getTime() - inicio.getTime();
      const dias = Math.max(
        0,
        Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24)) + 1,
      );

      return acumulador + (isNaN(dias) ? 0 : dias);
    }, 0);
  }, [solicitudes]);

  const enviarSolicitud = async () => {
    if (!tipoAusencia) {
      Alert.alert(
        "Formulario incompleto",
        "Por favor, selecciona un tipo de ausencia.",
      );
      return;
    }
    if (!motivo.trim()) {
      Alert.alert(
        "Formulario incompleto",
        "Por favor, escribe el motivo o causa legal de la ausencia.",
      );
      return;
    }

    try {
      setCargando(true);

      if (usuarioActual!.trabajador_id == null) return;

      const payload: AusenciaCreateRequest = {
        trabajador_id: usuarioActual!.trabajador_id,
        empresa_id: empresaSeleccionada!.id,
        tipo_ausencia: tipoAusencia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo: motivo,
        justificante_metadata: {},
      };

      const respuestaBackend: AusenciaResponse =
        await solicitarAusenciaOVacaciones(payload);

      const nueva: ItemAusencia = {
        id: respuestaBackend.id,
        trabajador_id: respuestaBackend.trabajador_id,
        tipo_ausencia: respuestaBackend.tipo_ausencia,
        estado: respuestaBackend.estado,
        fecha_inicio: respuestaBackend.fecha_inicio,
        fecha_fin: respuestaBackend.fecha_fin,
        motivo: respuestaBackend.motivo,
      };

      setSolicitudes([nueva, ...solicitudes]);
      setMotivo("");
      Alert.alert(
        "Solicitud Tramitada",
        "Tu petición ha sido enviada al departamento de recursos humanos.",
      );
    } catch {
      Alert.alert("Error", "No se pudo conectar con el servidor central.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <AppScreen
      title="Tiempo Libre y Bajas"
      subtitle="Gestiona tus solicitudes de vacaciones y permisos legales."
    >
      <Row>
        <StatCard
          label="Días Solicitados"
          value={totalDiasSolicitados.toString()}
        />
        <StatCard
          label="Aprobadas"
          value={solicitudes
            .filter((s) => s.estado === EstadoAusencia.APROBADA)
            .length.toString()}
          tone="success"
        />
        <StatCard
          label="Pendientes"
          value={solicitudes
            .filter((s) => s.estado === EstadoAusencia.PENDIENTE)
            .length.toString()}
          tone="warning"
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>Nueva Solicitud</ThemedText>
      <Card>
        <View style={styles.contenedorFormulario}>
          <ThemedText style={styles.label}>Tipo de Ausencia</ThemedText>
          <View style={styles.selectorTipos}>
            {(
              [
                "Vacaciones",
                "Baja_temporal",
                "Maternidad_paternidad",
                "Permiso_retribuido",
                "Ausencia_justificada",
              ] as TipoAusencia[]
            ).map((tipo) => (
              <Pressable
                key={tipo}
                style={[
                  styles.opcionTipo,
                  tipoAusencia === tipo && styles.opcionTipoActiva,
                ]}
                onPress={() => {
                  setTipoAusencia(tipo);
                }}
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

          <ThemedText style={styles.label}>Motivo o Justificación</ThemedText>
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            style={[styles.input, styles.textArea]}
            multiline
            placeholder="Detalla la causa legal de tu ausencia..."
            placeholderTextColor="#94A3B8"
          />
        </View>
        <Pressable
          style={[styles.submitButton, cargando && styles.buttonDisabled]}
          onPress={enviarSolicitud}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitText}>Enviar a RRHH</ThemedText>
          )}
        </Pressable>
      </Card>

      <ThemedText style={styles.sectionTitle}>
        Historial de Peticiones
      </ThemedText>

      {buscandoInicial ? (
        <ActivityIndicator
          size="small"
          color="#2563EB"
          style={{ marginTop: 12 }}
        />
      ) : solicitudes.length === 0 ? (
        <ThemedText style={styles.empty}>
          No constan solicitudes previas.
        </ThemedText>
      ) : (
        <View style={{ paddingBottom: 24 }}>
          {solicitudes.map((item) => (
            <Card key={item.id}>
              <View style={styles.solicitudItem}>
                <View style={styles.solicitudHeader}>
                  <ThemedText style={styles.solicitudTipo}>
                    {item.tipo_ausencia.replace(/_/g, " ").toUpperCase()}
                  </ThemedText>
                  <View
                    style={[
                      styles.badge,
                      item.estado === EstadoAusencia.APROBADA
                        ? styles.badgeAprobado
                        : item.estado === EstadoAusencia.PENDIENTE
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
              </View>
            </Card>
          ))}
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
  contenedorFormulario: { padding: 4, width: "100%" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  selectorTipos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  opcionTipo: {
    width: "auto",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  opcionTipoActiva: { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" },
  textoOpcion: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },
  textoOpcionActiva: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
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
    minHeight: 70,
    textAlignVertical: "top",
    paddingTop: 10,
    marginBottom: 16,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#2563EB",
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
    alignItems: "center",
    marginBottom: 8,
  },
  solicitudTipo: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeAprobado: { backgroundColor: "#DCFCE7" },
  badgePendiente: { backgroundColor: "#FEF3C7" },
  badgeRechazado: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  solicitudFechas: { fontSize: 13, color: "#475569", fontWeight: "600" },
  solicitudMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 10, fontSize: 14 },
});
