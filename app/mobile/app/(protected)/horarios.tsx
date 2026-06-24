// app/mobile/app/(protected)/horarios.tsx
import React, { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

interface DiaAgenda {
  id: string;
  dia: string;
  turno: string;
  horas: string;
  pausa: string;
  laborable: boolean;
}

export default function HorariosScreen() {
  // Datos simulados del mapeo de la tabla 'turnos' y su array de dias_semana [1..7]
  const [agendaSemanal] = useState<DiaAgenda[]>([
    {
      id: "1",
      dia: "Lunes",
      turno: "Turno Mañana Fijo",
      horas: "08:00 a 16:30",
      pausa: "30 minutos inc.",
      laborable: true,
    },
    {
      id: "2",
      dia: "Martes",
      turno: "Turno Mañana Fijo",
      horas: "08:00 a 16:30",
      pausa: "30 minutos inc.",
      laborable: true,
    },
    {
      id: "3",
      dia: "Miércoles",
      turno: "Turno Mañana Fijo",
      horas: "08:00 a 16:30",
      pausa: "30 minutos inc.",
      laborable: true,
    },
    {
      id: "4",
      dia: "Jueves",
      turno: "Turno Mañana Fijo",
      horas: "08:00 a 16:30",
      pausa: "30 minutos inc.",
      laborable: true,
    },
    {
      id: "5",
      dia: "Viernes",
      turno: "Turno Corto",
      horas: "08:00 a 14:00",
      pausa: "15 minutos inc.",
      laborable: true,
    },
    {
      id: "6",
      dia: "Sábado",
      turno: "Libranza",
      horas: "-",
      pausa: "-",
      laborable: false,
    },
    {
      id: "7",
      dia: "Domingo",
      turno: "Libranza",
      horas: "-",
      pausa: "-",
      laborable: false,
    },
  ]);

  return (
    <AppScreen
      title="Mi Planificación"
      subtitle="Consulta tu cuadrante y turnos laborales establecidos teóricos."
    >
      <Row>
        <StatCard label="Horas Semanales" value="38 horas" />
        <StatCard
          label="Días Laborables"
          value={agendaSemanal.filter((d) => d.laborable).length.toString()}
        />
        <StatCard label="Tipo Jornada" value="Continua" />
      </Row>

      <ThemedText style={styles.sectionTitle}>Agenda Semanal</ThemedText>

      <FlatList
        data={agendaSemanal}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Card>
            <View
              style={[styles.filaDia, !item.laborable && styles.filaDiaLibre]}
            >
              <View style={styles.columnaDia}>
                <ThemedText style={styles.nombreDia}>{item.dia}</ThemedText>
                <ThemedText style={styles.nombreTurno}>{item.turno}</ThemedText>
              </View>

              {item.laborable ? (
                <View style={styles.columnaHorario}>
                  <View style={styles.badgeHora}>
                    <IconSymbol name="schedule" size={14} color="#1E40AF" />
                    <ThemedText style={styles.textoHoras}>
                      {item.horas}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.textoPausa}>
                    Pausa: {item.pausa}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.badgeLibre}>
                  <ThemedText style={styles.textoLibre}>Descanso</ThemedText>
                </View>
              )}
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
  filaDia: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    width: "100%",
  },
  filaDiaLibre: { opacity: 0.75 },
  columnaDia: { flex: 1 },
  nombreDia: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  nombreTurno: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  columnaHorario: { alignItems: "flex-end", gap: 4 },
  badgeHora: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  textoHoras: { fontSize: 12, fontWeight: "700", color: "#1E40AF" },
  textoPausa: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  badgeLibre: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  textoLibre: { fontSize: 12, fontWeight: "700", color: "#475569" },
});
