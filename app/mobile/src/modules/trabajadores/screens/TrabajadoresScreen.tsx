import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { obtenerTrabajadores } from "../../../modules/trabajadores/api/trabajadoresService";
import {
  Estado,
  Trabajador,
} from "../../../modules/trabajadores/types/trabajador";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";

const estadoLabel = (estado?: Estado) =>
  estado === undefined ? "Sin estado" : Estado[estado];

export default function TrabajadoresScreen() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  useEffect(() => {
    obtenerTrabajadores().then(setTrabajadores);
  }, []);

  const activos = trabajadores.filter(
    (item) => item.estado !== Estado.Inactivo,
  );

  return (
    <AppScreen
      title="Trabajadores"
      subtitle="Directorio operativo para controlar jornada, empresa y estado."
    >
      <Row>
        <StatCard label="Total" value={String(trabajadores.length)} />
        <StatCard
          label="Activos"
          value={String(activos.length)}
          tone="success"
        />
        <StatCard
          label="Administradores"
          value={String(
            trabajadores.filter((item) => item.role === "admin").length,
          )}
        />
      </Row>
      {trabajadores.map((trabajador) => (
        <Card key={trabajador.id}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {trabajador.nombre[0]}
                {trabajador.apellidos[0]}
              </ThemedText>
            </View>
            <View style={styles.info}>
              <ThemedText style={styles.name}>
                {trabajador.nombre} {trabajador.apellidos}
              </ThemedText>
              <ThemedText style={styles.meta}>
                {trabajador.puesto} · {trabajador.email}
              </ThemedText>
            </View>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {estadoLabel(trabajador.estado)}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.body}>
            {trabajador.poblacion}, {trabajador.provincia} ·{" "}
            {trabajador.empresas?.length ?? 0} empresas
          </ThemedText>
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: "#0369A1",
    fontWeight: "900",
  },
  info: {
    flex: 1,
    minWidth: 220,
  },
  name: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    color: "#64748B",
  },
  badge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    color: "#475569",
  },
});
