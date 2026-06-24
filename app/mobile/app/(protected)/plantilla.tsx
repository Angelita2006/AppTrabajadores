// ARCHIVO: app/mobile/app/(protected)/plantilla.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    View
} from "react-native";
import { obtenerTrabajadores } from "../../src/modules/trabajadores/api/services";
import { useTrabajador } from "../../src/modules/trabajadores/store/UsuarioContext";
import {
    TipoUsuario,
    Trabajador,
} from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card } from "../../src/shared/ui/AppSurface";

export default function PlantillaScreen() {
  const { usuarioActual } = useTrabajador();
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado] = useState<"todos" | "altas">("todos");

  const esGestoria =
    usuarioActual?.tipo_usuario === ("admin_gestoria" as TipoUsuario);
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === ("admin_empresa" as TipoUsuario);
  const esAdministrador = esGestoria || esAdminEmpresa;

  useEffect(() => {
    if (esAdministrador) cargarPlantilla();
  }, [esAdministrador]);

  const cargarPlantilla = async () => {
    try {
      const datos = await obtenerTrabajadores();
      setPlantilla(datos);
    } catch {
      Alert.alert("Error", "Fallo al sincronizar datos.");
    } finally {
      setCargando(false);
    }
  };

  const plantillaFiltrada = useMemo(() => {
    return plantilla.filter((item) => {
      const coincideTenant = esGestoria
        ? true
        : item.empresa_id === usuarioActual?.empresa_id;
      return coincideTenant && (filtroEstado === "todos" || item.activo);
    });
  }, [plantilla, filtroEstado, usuarioActual, esGestoria]);

  return (
    <AppScreen
      title="Control de Plantilla"
      subtitle="Trazabilidad y control legal de expedientes en alta."
    >
      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={plantillaFiltrada}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.nombreEmpleado}>
                  {item.nombre} {item.apellidos}
                </ThemedText>
              </View>
              <ThemedText style={styles.infoText}>
                NIF/NIE: {item.nif_nie}
              </ThemedText>
              <ThemedText style={styles.infoText}>
                Alta: {item.fecha_alta_empresa}
              </ThemedText>
            </Card>
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  cardHeader: { marginBottom: 8 },
  nombreEmpleado: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  infoText: { fontSize: 14, color: "#334155", marginTop: 2 },
});
