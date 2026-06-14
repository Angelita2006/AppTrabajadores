import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTrabajador } from "@/modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "@/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/shared/ui/AppSurface";
import { mockDb, Vacacion } from "@/services/api/mockDb";

export default function VacacionesScreen() {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [fechaInicio, setFechaInicio] = useState("2026-07-15");
  const [fechaFin, setFechaFin] = useState("2026-07-19");
  const [motivo, setMotivo] = useState("Solicitud de vacaciones");

  const cargar = () => mockDb.getVacaciones().then(setVacaciones);

  useEffect(() => {
    cargar();
  }, []);

  const solicitar = async () => {
    if (!trabajadorActual || !empresaSeleccionada) {
      Alert.alert("Faltan datos", "Inicia sesión y selecciona una empresa.");
      return;
    }
    await mockDb.createVacacion({
      idTrabajador: trabajadorActual.id,
      idEmpresa: empresaSeleccionada.id,
      fechaInicio,
      fechaFin,
      motivo,
    });
    await cargar();
  };

  return (
    <AppScreen title="Vacaciones" subtitle="Solicitudes en memoria con estados de aprobación.">
      <Row>
        <StatCard label="Solicitudes" value={String(vacaciones.length)} />
        <StatCard label="Pendientes" value={String(vacaciones.filter((item) => item.estado === "pendiente").length)} tone="warning" />
      </Row>
      <Card>
        <ThemedText style={styles.title}>Nueva solicitud</ThemedText>
        <View style={styles.formRow}>
          <TextInput value={fechaInicio} onChangeText={setFechaInicio} style={styles.input} />
          <TextInput value={fechaFin} onChangeText={setFechaFin} style={styles.input} />
          <TextInput value={motivo} onChangeText={setMotivo} style={styles.inputWide} />
        </View>
        <Pressable style={styles.button} onPress={solicitar}>
          <ThemedText style={styles.buttonText}>Enviar solicitud</ThemedText>
        </Pressable>
      </Card>
      {vacaciones.map((vacacion) => (
        <Card key={vacacion.id}>
          <ThemedText style={styles.title}>{vacacion.fechaInicio} - {vacacion.fechaFin}</ThemedText>
          <ThemedText style={styles.body}>{vacacion.motivo}</ThemedText>
          <ThemedText style={styles.status}>Estado: {vacacion.estado}</ThemedText>
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  body: { color: "#475569" },
  status: { color: "#2563EB", fontWeight: "800", textTransform: "capitalize" },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    minWidth: 150,
    padding: 12,
  },
  inputWide: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    minWidth: 220,
    padding: 12,
  },
  button: { backgroundColor: "#2563EB", borderRadius: 8, padding: 12 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" },
});
