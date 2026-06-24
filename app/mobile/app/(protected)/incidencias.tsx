// app/mobile/app/(protected)/incidencias.tsx
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

interface ItemIncidencia {
  id: string;
  fecha: string;
  tipo_ajuste: string;
  motivo: string;
  estado: "pendiente" | "subsanada";
}

export default function IncidenciasScreen() {
  const [incidencias, setIncidencias] = useState<ItemIncidencia[]>([]);
  const [cargando, setCargando] = useState(false);

  // Estados locales del formulario de incidencia
  const [fechaAfectada, setFechaAfectada] = useState("2026-06-24");
  const [tipoAjuste, setTipoAjuste] = useState("Olvido de marcaje de salida");
  const [comentario, setComentario] = useState("");

  const reportarIncidencia = async () => {
    if (!comentario.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Describe lo sucedido para que RRHH pueda validar la marca.",
      );
      return;
    }

    try {
      setCargando(true);
      // Simula el POST /api/correcciones del backend
      await new Promise((resolve) => setTimeout(resolve, 700));

      const nueva: ItemIncidencia = {
        id: Math.random().toString(),
        fecha: fechaAfectada,
        tipo_ajuste: tipoAjuste,
        motivo: comentario,
        estado: "pendiente",
      };

      setIncidencias([nueva, ...incidencias]);
      setComentario("");
      Alert.alert(
        "Reporte Enviado",
        "La solicitud de corrección ha quedado registrada en la bitácora auditable.",
      );
    } catch {
      Alert.alert("Error", "No se pudo sincronizar el reporte.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <AppScreen
      title="Incidencias y Errores"
      subtitle="Solicita correcciones sobre olvidos o descuadres en tus fichajes."
    >
      <Row>
        <StatCard
          label="Alertas Activas"
          value={incidencias
            .filter((i) => i.estado === "pendiente")
            .length.toString()}
          tone="warning"
        />
        <StatCard
          label="Subsanadas"
          value={incidencias
            .filter((i) => i.estado === "subsanada")
            .length.toString()}
          tone="success"
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>
        Reportar Error de Marcaje
      </ThemedText>
      <Card>
        <View style={styles.contenedorForm}>
          <ThemedText style={styles.label}>Fecha del Descuadre</ThemedText>
          <TextInput
            value={fechaAfectada}
            onChangeText={setFechaAfectada}
            style={styles.input}
            placeholder="AAAA-MM-DD"
          />

          <ThemedText style={styles.label}>Tipo de Corrección</ThemedText>
          <TextInput
            value={tipoAjuste}
            onChangeText={setTipoAjuste}
            style={styles.input}
            placeholder="Ej: Olvido de Entrada"
          />

          <ThemedText style={styles.label}>
            Explicación para Recursos Humanos
          </ThemedText>
          <TextInput
            value={comentario}
            onChangeText={setComentario}
            style={[styles.input, styles.textArea]}
            multiline
            placeholder="Especifica la hora real del evento y el motivo del olvido..."
            placeholderTextColor="#94A3B8"
          />

          <Pressable
            style={[styles.submitButton, cargando && styles.disabled]}
            onPress={reportarIncidencia}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitText}>
                Solicitar Rectificación
              </ThemedText>
            )}
          </Pressable>
        </View>
      </Card>

      <ThemedText style={styles.sectionTitle}>
        Trazabilidad de Ajustes
      </ThemedText>
      <FlatList
        data={incidencias}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.itemCard}>
              <View style={styles.headerCard}>
                <ThemedText style={styles.itemFecha}>
                  Jornada: {item.fecha}
                </ThemedText>
                <View
                  style={[
                    styles.badge,
                    item.estado === "pendiente"
                      ? styles.badgeWarning
                      : styles.badgeSuccess,
                  ]}
                >
                  <ThemedText style={styles.badgeText}>
                    {item.estado}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.itemTipo}>
                {item.tipo_ajuste}
              </ThemedText>
              <ThemedText style={styles.itemMotivo}>{item.motivo}</ThemedText>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>
            No tienes incidencias registradas en este periodo.
          </ThemedText>
        }
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
  contenedorForm: { padding: 4, width: "100%" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
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
  撕textArea: {
    height: 60,
    textAlignVertical: "top",
    paddingTop: 10,
    marginBottom: 16,
  },
  textArea: {
    height: 65,
    textAlignVertical: "top",
    paddingTop: 10,
    marginBottom: 16,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#EA580C",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  itemCard: { width: "100%", paddingVertical: 2 },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemFecha: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeWarning: { backgroundColor: "#FFEDD5" },
  badgeSuccess: { backgroundColor: "#DCFCE7" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  itemTipo: { fontSize: 13, color: "#1E293B", fontWeight: "600" },
  itemMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontStyle: "italic",
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 10 },
});
