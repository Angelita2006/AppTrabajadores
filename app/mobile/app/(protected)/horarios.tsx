import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { AsignacionTurno } from "../../src/modules/asignaciones-turno/types/asignacion-turno";
import { obtenerAsignacionesTurnoTrabajador } from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

export default function HorariosScreen() {
  const { usuarioActual, empresaSeleccionada } = useSesion();
  const [cuadrante, setCuadrante] = useState<AsignacionTurno[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Declaramos la función de red aquí adentro.
    // Al ser local, encapsula sus dependencias y elimina advertencias de ESLint.
    const cargarPlanificacionHoraria = async () => {
      try {
        setCargando(true);
        // Descarga real desde tu base de datos PostgreSQL
        const datos = await obtenerAsignacionesTurnoTrabajador(
          usuarioActual!.trabajador_id,
        );
        setCuadrante(datos);
      } catch {
        Alert.alert(
          "Error de Sincronización",
          "No se ha podido descargar tu calendario de turnos oficiales.",
        );
      } finally {
        setCargando(false);
      }
    };

    if (usuarioActual?.trabajador_id) {
      cargarPlanificacionHoraria();
    }
  }, [usuarioActual]); // El array vigila únicamente la cuenta de usuario de PostgreSQL

  return (
    <AppScreen
      title="Mi Planificación"
      subtitle={`Calendario oficial asignado por: ${empresaSeleccionada?.nombre ?? "Tu Organización"}`}
    >
      {/* Resúmenes analíticos rápidos del cuadrante superior */}
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
        <FlatList
          data={cuadrante}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            // Extraemos los metadatos del objeto anidado 'turno' enviado por FastAPI
            const turnoInfo = item.turno;
            const colorIndicador = turnoInfo?.color_hex ?? "#2563EB";

            return (
              <Card>
                <View style={styles.filaAsignacion}>
                  {/* Barra de color dinámica inyectada desde los ajustes del turno */}
                  <View
                    style={[
                      styles.barraColor,
                      { backgroundColor: colorIndicador },
                    ]}
                  />

                  <View style={styles.cuerpoTarjeta}>
                    <View style={styles.headerTarjeta}>
                      <ThemedText style={styles.nombreTurno}>
                        {turnoInfo?.nombre ?? "Turno Sin Especificar"}
                      </ThemedText>
                      <View style={styles.badgeVigencia}>
                        <ThemedText style={styles.textoVigencia}>
                          Activo
                        </ThemedText>
                      </View>
                    </View>

                    {/* Tramos horarios de entrada y salida oficiales */}
                    <View style={styles.gridHoras}>
                      <View style={styles.itemHora}>
                        <IconSymbol name="schedule" size={16} color="#475569" />
                        <ThemedText style={styles.textoHoras}>
                          {turnoInfo
                            ? `${turnoInfo.hora_inicio.substring(0, 5)} a ${turnoInfo.hora_fin.substring(0, 5)}`
                            : "-"}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.textoPausa}>
                        Descanso: {turnoInfo?.minutos_pausa_obligatoria ?? 0}{" "}
                        min.
                      </ThemedText>
                    </View>

                    <View style={styles.separador} />

                    {/* Fechas de validez del cuadrante */}
                    <ThemedText style={styles.textoRangoFechas}>
                      Válido desde el {item.fecha_inicio}{" "}
                      {item.fecha_fin
                        ? `hasta el ${item.fecha_fin}`
                        : "en adelante"}
                    </ThemedText>
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              No tienes ningún cuadrante horario asignado en este tenant
              corporativo. Contacta con RRHH.
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
  filaAsignacion: {
    flexDirection: "row",
    width: "100%",
    gap: 14,
    paddingVertical: 2,
  },
  barraColor: { width: 4, borderRadius: 2 },
  cuerpoTarjeta: { flex: 1, gap: 4 },
  headerTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombreTurno: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
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
    marginTop: 6,
  },
  itemHora: { flexDirection: "row", alignItems: "center", gap: 6 },
  textoHoras: { fontSize: 14, fontWeight: "700", color: "#334155" },
  textoPausa: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  separador: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  textoRangoFechas: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 24,
    lineHeight: 20,
  },
});
