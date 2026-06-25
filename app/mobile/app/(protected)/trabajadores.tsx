// app/mobile/app/(protected)/trabajadores.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { obtenerTrabajadores } from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import {
  TipoUsuario,
  Trabajador,
} from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

export default function AdministracionTrabajadoresScreen() {
  const { usuarioActual } = useSesion();
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "altas" | "bajas">(
    "todos",
  );

  const esGestoria =
    usuarioActual?.tipo_usuario === ("admin_gestoria" as TipoUsuario);
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === ("admin_empresa" as TipoUsuario);
  const esAdministrador = esGestoria || esAdminEmpresa;

  useEffect(() => {
    if (esAdministrador) {
      cargarPlantillaServidor();
    }
  }, [esAdministrador]);

  const cargarPlantillaServidor = async () => {
    try {
      setCargando(true);
      const datos = await obtenerTrabajadores();
      setPlantilla(datos);
    } catch {
      Alert.alert(
        "Error de red",
        "No se ha podido sincronizar la plantilla desde el servidor.",
      );
    } finally {
      setCargando(false);
    }
  };

  // Filtrado reactivo en memoria aislando el Tenant de la empresa por seguridad legal
  const plantillaFiltrada = useMemo(() => {
    return plantilla.filter((item) => {
      const coincideTenant = esGestoria
        ? true
        : item.empresa_id === usuarioActual?.empresa_id;
      const coincideFiltro =
        filtroEstado === "todos" ||
        (filtroEstado === "altas" && item.activo) ||
        (filtroEstado === "bajas" && !item.activo);
      return coincideTenant && coincideFiltro;
    });
  }, [plantilla, filtroEstado, usuarioActual, esGestoria]);

  if (!esAdministrador) {
    return (
      <AppScreen title="Acceso Denegado" subtitle="Escudo de Privacidad">
        <View style={styles.contenedorAlerta}>
          <Card>
            <ThemedText style={styles.titleAlerta}>
              Área Restringida por Ley
            </ThemedText>
            <ThemedText style={styles.textAlerta}>
              De acuerdo con las normativas del RGPD, los historiales y datos de
              filiación del personal están reservados exclusivamente para
              Inspectores de Trabajo o Administradores autorizados.
            </ThemedText>
          </Card>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Panel de Plantilla"
      subtitle="Trazabilidad y control legal de expedientes en alta."
    >
      <Row>
        <StatCard
          label="Filtrados"
          value={plantillaFiltrada.length.toString()}
        />
        <StatCard
          label="Altas Activas"
          value={plantillaFiltrada.filter((t) => t.activo).length.toString()}
          tone="success"
        />
        <StatCard
          label="Alcance Saas"
          value={esGestoria ? "Global" : "Aislado"}
        />
      </Row>

      <View style={styles.contenedorFiltros}>
        <Pressable
          style={[
            styles.botonFiltro,
            filtroEstado === "todos" && styles.botonFiltroActivo,
          ]}
          onPress={() => setFiltroEstado("todos")}
        >
          <ThemedText
            style={[
              styles.textoBoton,
              filtroEstado === "todos" && styles.textoBotonActivo,
            ]}
          >
            Todos
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.botonFiltro,
            filtroEstado === "altas" && styles.botonFiltroActivo,
          ]}
          onPress={() => setFiltroEstado("altas")}
        >
          <ThemedText
            style={[
              styles.textoBoton,
              filtroEstado === "altas" && styles.textoBotonActivo,
            ]}
          >
            Altas
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.botonFiltro,
            filtroEstado === "bajas" && styles.botonFiltroActivo,
          ]}
          onPress={() => setFiltroEstado("bajas")}
        >
          <ThemedText
            style={[
              styles.textoBoton,
              filtroEstado === "bajas" && styles.textoBotonActivo,
            ]}
          >
            Bajas
          </ThemedText>
        </Pressable>
      </View>

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
                <View
                  style={[
                    styles.badge,
                    item.activo ? styles.badgeActivo : styles.badgeInactivo,
                  ]}
                >
                  <ThemedText style={styles.badgeText}>
                    {item.activo ? "Vigente" : "Cese"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.gridInfo}>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>NIF / NIE:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {item.nif_nie}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Fecha Alta:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {item.fecha_alta_empresa}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Email:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {item.email ?? "No registrado"}
                  </ThemedText>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              No se encontraron empleados registrados.
            </ThemedText>
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorAlerta: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    padding: 4,
    marginTop: 20,
  },
  titleAlerta: {
    color: "#991B1B",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  textAlerta: { color: "#7F1D1D", fontSize: 14, lineHeight: 20 },
  contenedorFiltros: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 12,
    marginVertical: 8,
    gap: 4,
  },
  botonFiltro: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  botonFiltroActivo: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  textoBoton: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  textoBotonActivo: { color: "#1E293B", fontWeight: "700" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  nombreEmpleado: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeActivo: { backgroundColor: "#DCFCE7" },
  badgeInactivo: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#15803D" },
  gridInfo: { gap: 6 },
  infoRow: { flexDirection: "row" },
  infoLabel: { fontSize: 13, color: "#64748B", width: 110, fontWeight: "600" },
  infoValue: { fontSize: 13, color: "#334155", fontWeight: "500" },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 20 },
});
