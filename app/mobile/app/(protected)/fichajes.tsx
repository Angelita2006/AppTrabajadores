// app/mobile/app/(protected)/fichajes.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

interface ItemFichaje {
  id: string;
  fecha_hora: string;
  tipo_evento: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  metodo_fichaje: string;
  observaciones?: string | null;
}

export default function FichajesHistorialScreen() {
  const { trabajadorActual } = useSesion();
  const [historial, setHistorial] = useState<ItemFichaje[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMarcajesDelDia();
  }, []);

  const cargarMarcajesDelDia = async () => {
    // Simula la lectura de la vista 'v_fichajes_vigentes' filtrada por tu UUID de trabajador
    await new Promise((resolve) => setTimeout(resolve, 400));
    setHistorial([
      {
        id: "f1-uuid",
        fecha_hora: "2026-06-24 14:15:22",
        tipo_evento: "SALIDA",
        metodo_fichaje: "app_movil",
        observaciones: "Fin de turno ordinario",
      },
      {
        id: "f2-uuid",
        fecha_hora: "2026-06-24 08:02:11",
        tipo_evento: "ENTRADA",
        metodo_fichaje: "app_movil",
        observaciones: null,
      },
    ]);
    setCargando(false);
  };

  const obtenerColorEvento = (tipo: string) => {
    if (tipo === "ENTRADA") return "#16A34A";
    if (tipo === "SALIDA") return "#DC2626";
    return "#EA580C"; // Pausas
  };

  return (
    <AppScreen
      title="Mis Marcajes"
      subtitle="Historial cronológico inmutable registrado hoy en el servidor."
    >
      <Row>
        <StatCard label="Registros Hoy" value={historial.length.toString()} />
        <StatCard label="Expediente" value={trabajadorActual?.nif_nie ?? "-"} />
      </Row>

      <ThemedText style={styles.sectionTitle}>
        Línea de Tiempo Horaria
      </ThemedText>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          data={historial}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.fichajeFila}>
                {/* Indicador visual tipo Timeline */}
                <View
                  style={[
                    styles.lineaColor,
                    { backgroundColor: obtenerColorEvento(item.tipo_evento) },
                  ]}
                />

                <View style={styles.contenidoFichaje}>
                  <View style={styles.filaHeader}>
                    <ThemedText
                      style={[
                        styles.tipoEvento,
                        { color: obtenerColorEvento(item.tipo_evento) },
                      ]}
                    >
                      {item.tipo_evento}
                    </ThemedText>
                    <ThemedText style={styles.metodoTexto}>
                      Vía: {item.metodo_fichaje.replace("_", " ")}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.marcaTiempo}>
                    Hora oficial: {item.fecha_hora.split(" ")[1]}
                  </ThemedText>
                  <ThemedText style={styles.fechaTexto}>
                    Fecha: {item.fecha_hora.split(" ")[0]}
                  </ThemedText>

                  {item.observaciones && (
                    <ThemedText style={styles.notaTexto}>
                      {'Nota: "'}
                      {item.observaciones}
                      {'"'}
                    </ThemedText>
                  )}
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.empty}>
              No has realizado ningún marcaje en la jornada de hoy.
            </ThemedText>
          }
        />
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
  fichajeFila: {
    flexDirection: "row",
    width: "100%",
    gap: 14,
    paddingVertical: 4,
  },
  lineaColor: { width: 4, borderRadius: 2, height: "100%" },
  contenidoFichaje: { flex: 1, gap: 2 },
  filaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tipoEvento: { fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  metodoTexto: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  marcaTiempo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  fechaTexto: { fontSize: 12, color: "#475569", fontWeight: "500" },
  notaTexto: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 4,
    backgroundColor: "#F8FAFC",
    padding: 6,
    borderRadius: 6,
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 15 },
});
