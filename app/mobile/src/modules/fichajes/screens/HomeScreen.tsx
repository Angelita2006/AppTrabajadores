import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { EmpresaSelector } from "@/modules/empresas/components/EmpresaSelector";
import { crearFichaje, obtenerFichajesEmpresaTrabajador } from "@/modules/fichajes/api/fichajesService";
import { Fichaje } from "@/modules/fichajes/types/fichaje";
import { obtenerHorarioTrabajadorEmpresa } from "@/modules/horarios/api/horariosService";
import { Horario } from "@/modules/horarios/types/horario";
import { useTrabajador } from "@/modules/trabajadores/store/TrabajadorContext";
import { AppScreen, Card, Row, StatCard } from "@/shared/ui/AppSurface";
import { ThemedText } from "@/shared/components/themed-text";

const formatTime = (date?: Date | number) =>
  date ? new Date(date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "--:--";

const estadoFromUltimo = (fichaje?: Fichaje) => {
  if (!fichaje || fichaje.tipo === "salida") return "Fuera de jornada";
  if (fichaje.tipo === "descanso") return "En descanso";
  return "Trabajando";
};

export default function HomeScreen() {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [horario, setHorario] = useState<Horario | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!trabajadorActual?.id || !empresaSeleccionada?.id) return;
    const [fichajesData, horarioData] = await Promise.all([
      obtenerFichajesEmpresaTrabajador(trabajadorActual.id, empresaSeleccionada.id),
      obtenerHorarioTrabajadorEmpresa(trabajadorActual.id, empresaSeleccionada.id),
    ]);
    setFichajes(fichajesData);
    setHorario(horarioData);
  }, [trabajadorActual?.id, empresaSeleccionada?.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const ultimoFichaje = fichajes.at(-1);
  const estado = estadoFromUltimo(ultimoFichaje);
  const horasHoy = useMemo(() => {
    const entrada = fichajes.find((fichaje) => fichaje.tipo === "entrada");
    const salida = [...fichajes].reverse().find((fichaje) => fichaje.tipo === "salida");
    if (!entrada) return "0 h";
    const fin = salida?.fecha ?? Date.now();
    const hours = Math.max(0, (fin - entrada.fecha) / 36e5);
    return `${hours.toFixed(1)} h`;
  }, [fichajes]);

  const registrar = async (tipo: Fichaje["tipo"]) => {
    if (!trabajadorActual?.id || !empresaSeleccionada?.id) {
      Alert.alert("Faltan datos", "Selecciona trabajador y empresa.");
      return;
    }
    await crearFichaje(trabajadorActual.id, empresaSeleccionada.id, tipo);
    await cargarDatos();
  };

  return (
    <AppScreen
      title="Panel de fichaje"
      subtitle="Control diario de jornada con datos en memoria para demo."
    >
      <EmpresaSelector />
      <Row>
        <StatCard label="Estado actual" value={estado} tone={estado === "Trabajando" ? "success" : "neutral"} />
        <StatCard label="Horas hoy" value={horasHoy} />
        <StatCard label="Ultimo fichaje" value={formatTime(ultimoFichaje?.fecha)} />
      </Row>

      <Card>
        <ThemedText style={styles.sectionTitle}>Acciones rápidas</ThemedText>
        <View style={styles.actions}>
          <ActionButton label="Entrada" tone="success" onPress={() => registrar("entrada")} />
          <ActionButton label="Descanso" tone="warning" onPress={() => registrar("descanso")} />
          <ActionButton label="Fin descanso" tone="neutral" onPress={() => registrar("fin_descanso")} />
          <ActionButton label="Salida" tone="danger" onPress={() => registrar("salida")} />
        </View>
      </Card>

      <Card>
        <ThemedText style={styles.sectionTitle}>Horario asignado</ThemedText>
        <ThemedText style={styles.body}>
          {horario
            ? `${horario.tipoJornada} · ${horario.diasSemana} · ${formatTime(horario.hora_entrada1)} - ${formatTime(horario.hora_salida1)}`
            : "No hay horario asignado para esta empresa."}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText style={styles.sectionTitle}>Actividad de hoy</ThemedText>
        {fichajes.length === 0 ? (
          <ThemedText style={styles.body}>Todavía no hay fichajes registrados.</ThemedText>
        ) : (
          fichajes.map((fichaje) => (
            <View key={fichaje.id} style={styles.listRow}>
              <ThemedText style={styles.listTitle}>{fichaje.tipo.replace("_", " ")}</ThemedText>
              <ThemedText style={styles.listMeta}>{formatTime(fichaje.fecha)}</ThemedText>
            </View>
          ))
        )}
      </Card>
    </AppScreen>
  );
}

function ActionButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.button, styles[tone]]} onPress={onPress}>
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    color: "#475569",
    lineHeight: 22,
  },
  button: {
    borderRadius: 8,
    minWidth: 132,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  success: {
    backgroundColor: "#16A34A",
  },
  warning: {
    backgroundColor: "#D97706",
  },
  danger: {
    backgroundColor: "#DC2626",
  },
  neutral: {
    backgroundColor: "#2563EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
  listRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  listTitle: {
    color: "#0F172A",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  listMeta: {
    color: "#64748B",
  },
});
