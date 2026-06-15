import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { obtenerHorarios } from "../../../modules/horarios/api/horariosService";
import { Horario } from "../../../modules/horarios/types/horario";
import { obtenerTrabajadores } from "../../../modules/trabajadores/api/trabajadoresService";
import { Trabajador } from "../../../modules/trabajadores/types/trabajador";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";

const time = (date: Date) =>
  new Date(date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function HorariosScreen() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  useEffect(() => {
    Promise.all([obtenerHorarios(), obtenerTrabajadores()]).then(
      ([horariosData, trabajadoresData]) => {
        setHorarios(horariosData);
        setTrabajadores(trabajadoresData);
      },
    );
  }, []);

  const trabajadorNombre = (id: number) => {
    const trabajador = trabajadores.find((item) => item.id === id);
    return trabajador
      ? `${trabajador.nombre} ${trabajador.apellidos}`
      : `Trabajador ${id}`;
  };

  return (
    <AppScreen
      title="Horarios"
      subtitle="Planificación semanal por trabajador y empresa."
    >
      <Row>
        <StatCard label="Horarios" value={String(horarios.length)} />
        <StatCard label="Media días" value="5" />
      </Row>
      {horarios.map((horario) => (
        <Card key={horario.id}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>
                {trabajadorNombre(horario.idTrabajador)}
              </ThemedText>
              <ThemedText style={styles.meta}>
                {horario.tipoJornada} · {horario.diasSemana}
              </ThemedText>
            </View>
            <View style={styles.hours}>
              <ThemedText style={styles.hoursText}>
                {time(horario.hora_entrada1)} - {time(horario.hora_salida1)}
              </ThemedText>
            </View>
          </View>
          {horario.hora_entrada2 && horario.hora_salida2 ? (
            <ThemedText style={styles.body}>
              Segundo tramo: {time(horario.hora_entrada2)} -{" "}
              {time(horario.hora_salida2)}
            </ThemedText>
          ) : null}
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    color: "#64748B",
  },
  hours: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hoursText: {
    color: "#166534",
    fontWeight: "900",
  },
  body: {
    color: "#475569",
  },
});
