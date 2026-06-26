// app/mobile/app/(protected)/vacaciones.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

// Definición de tipos y enumerados idénticos a tu backend de PostgreSQL
enum TipoAusenciaEnum {
  vacaciones = "vacaciones",
  baja_temporal = "baja_temporal",
  maternidad_paternidad = "maternidad_paternidad",
  permiso_retribuido = "permiso_retribuido",
}

enum EstadoAusenciaEnum {
  pendiente = "pendiente",
  aprobada = "aprobada",
  rechazada = "rechazada",
}

interface ItemAusencia {
  id: string;
  tipo_ausencia: TipoAusenciaEnum;
  estado: EstadoAusenciaEnum;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}

export default function VacacionesScreen() {
  useSesion();
  const [solicitudes, setSolicitudes] = useState<ItemAusencia[]>([]);
  const [cargando, setCargando] = useState(false);

  // Estados locales para el formulario de alta manual
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoAusenciaEnum>(
    TipoAusenciaEnum.vacaciones,
  );
  const [fechaInicio, setFechaInicio] = useState("2026-07-01");
  const [fechaFin, setFechaFin] = useState("2026-07-15");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    cargarHistoricoAusencias();
  }, []);

  const cargarHistoricoAusencias = async () => {
    // Simulamos la descarga de datos desde /api/ausencias/trabajador/{id}
    setSolicitudes([
      {
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        tipo_ausencia: TipoAusenciaEnum.vacaciones,
        estado: EstadoAusenciaEnum.aprobada,
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-01-07",
        motivo: "Periodo navideño retrasado",
      },
      {
        id: "f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c",
        tipo_ausencia: TipoAusenciaEnum.permiso_retribuido,
        estado: EstadoAusenciaEnum.pendiente,
        fecha_inicio: "2026-08-10",
        fecha_fin: "2026-08-11",
        motivo: "Cita médica especialista",
      },
    ]);
  };

  const enviarSolicitud = async () => {
    if (!motivo.trim()) {
      Alert.alert(
        "Formulario incompleto",
        "Por favor, escribe el motivo o causa legal de la ausencia.",
      );
      return;
    }

    try {
      setCargando(true);
      // Simula el POST /api/ausencias hacia FastAPI
      await new Promise((resolve) => setTimeout(resolve, 800));

      const nueva: ItemAusencia = {
        id: Math.random().toString(), // El backend generará un UUID real
        tipo_ausencia: tipoSeleccionado,
        estado: EstadoAusenciaEnum.pendiente,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo: motivo,
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
          value={solicitudes.length.toString()}
        />
        <StatCard
          label="Aprobadas"
          value={solicitudes
            .filter((s) => s.estado === EstadoAusenciaEnum.aprobada)
            .length.toString()}
          tone="success"
        />
        <StatCard
          label="Pendientes"
          value={solicitudes
            .filter((s) => s.estado === EstadoAusenciaEnum.pendiente)
            .length.toString()}
          tone="warning"
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>Nueva Solicitud</ThemedText>
      <Card>
        <View style={styles.contenedorFormulario}>
          <ThemedText style={styles.label}>Tipo de Ausencia</ThemedText>
          <View style={styles.selectorTipos}>
            {Object.values(TipoAusenciaEnum).map((tipo) => (
              <Pressable
                key={tipo}
                style={[
                  styles.opcionTipo,
                  tipoSeleccionado === tipo && styles.opcionTipoActiva,
                ]}
                onPress={() => setTipoSeleccionado(tipo)}
              >
                <ThemedText
                  style={[
                    styles.textoOpcion,
                    tipoSeleccionado === tipo && styles.textoOpcionActiva,
                  ]}
                >
                  {tipo.replace("_", " ")}
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
            numberOfLines={3}
            placeholder="Detalla la causa legal de tu ausencia..."
            placeholderTextColor="#94A3B8"
          />

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
        </View>
      </Card>

      <ThemedText style={styles.sectionTitle}>
        Historial de Peticiones
      </ThemedText>
      <FlatList
        data={solicitudes}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.solicitudItem}>
              <View style={styles.solicitudHeader}>
                <ThemedText style={styles.solicitudTipo}>
                  {item.tipo_ausencia.replace("_", " ").toUpperCase()}
                </ThemedText>
                <View
                  style={[
                    styles.badge,
                    item.estado === EstadoAusenciaEnum.aprobada
                      ? styles.badgeAprobado
                      : item.estado === EstadoAusenciaEnum.pendiente
                        ? styles.badgePendiente
                        : styles.badgeRechazado,
                  ]}
                >
                  <ThemedText style={styles.badgeText}>
                    {item.estado}
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
        )}
      />
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  opcionTipoActiva: { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" },
  textoOpcion: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  textoOpcionActiva: { color: "#1E40AF", fontWeight: "700" },
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
    height: 70,
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
});
