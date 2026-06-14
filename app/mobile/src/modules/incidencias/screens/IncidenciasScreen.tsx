import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTrabajador } from "@/modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "@/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/shared/ui/AppSurface";
import { Incidencia, mockDb } from "@/services/api/mockDb";

export default function IncidenciasScreen() {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [descripcion, setDescripcion] = useState("Olvidé fichar la salida.");

  const cargar = () => mockDb.getIncidencias().then(setIncidencias);

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    if (!trabajadorActual || !empresaSeleccionada) {
      Alert.alert("Faltan datos", "Inicia sesión y selecciona una empresa.");
      return;
    }
    await mockDb.createIncidencia({
      idTrabajador: trabajadorActual.id,
      idEmpresa: empresaSeleccionada.id,
      tipo: "olvido_fichaje",
      fecha: new Date().toISOString().slice(0, 10),
      descripcion,
    });
    await cargar();
  };

  return (
    <AppScreen title="Incidencias" subtitle="Registro de correcciones y ausencias pendiente de revisión.">
      <Row>
        <StatCard label="Incidencias" value={String(incidencias.length)} />
        <StatCard label="Abiertas" value={String(incidencias.filter((item) => item.estado !== "resuelta").length)} tone="warning" />
      </Row>
      <Card>
        <ThemedText style={styles.title}>Nueva incidencia</ThemedText>
        <View style={styles.formRow}>
          <TextInput value={descripcion} onChangeText={setDescripcion} style={styles.input} />
          <Pressable style={styles.button} onPress={crear}>
            <ThemedText style={styles.buttonText}>Crear incidencia</ThemedText>
          </Pressable>
        </View>
      </Card>
      {incidencias.map((incidencia) => (
        <Card key={incidencia.id}>
          <ThemedText style={styles.title}>{incidencia.tipo.replace("_", " ")}</ThemedText>
          <ThemedText style={styles.body}>{incidencia.descripcion}</ThemedText>
          <ThemedText style={styles.status}>{incidencia.fecha} · {incidencia.estado}</ThemedText>
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "#0F172A", fontSize: 18, fontWeight: "800", textTransform: "capitalize" },
  body: { color: "#475569" },
  status: { color: "#2563EB", fontWeight: "800", textTransform: "capitalize" },
  formRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    minWidth: 240,
    padding: 12,
  },
  button: { backgroundColor: "#2563EB", borderRadius: 8, padding: 12 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" },
});
