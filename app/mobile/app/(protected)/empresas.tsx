import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
// import { obtenerEmpresas } from "../../src/modules/empresas/api/services";
import { useTrabajador } from "../../src/modules/trabajadores/store/UsuarioContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

// Definición de tipo local mapeada milimétricamente con tu modelo físico de Empresas
interface ItemEmpresa {
  id: string;
  razon_social: string;
  cif: string;
  nombre_comercial?: string | null;
  zona_horaria: string;
  codigo_cnae?: string | null;
  convenio_colectivo?: string | null;
  direccion_fiscal?: string | null;
}

export default function EmpresasScreen() {
  const { usuarioActual } = useTrabajador();
  const [empresas, setEmpresas] = useState<ItemEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtro estricto basado en la matriz RBAC de tu backend Saas
  const esGestoria = usuarioActual?.tipo_usuario === "admin_gestoria";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "admin_empresa";
  const esAutorizado = esGestoria || esAdminEmpresa;

  useEffect(() => {
    if (esAutorizado) {
      cargarCatalogoEmpresas();
    }
  }, [esAutorizado]);

  const cargarCatalogoEmpresas = async () => {
    try {
      setCargando(true);
      // Simulación de GET /api/empresas (Si es admin_empresa, el backend filtra por su tenant)
      // await obtenerEmpresas();

      setEmpresas([obtenerEmpresas()]);
    } catch {
      Alert.alert(
        "Error Saas",
        "No se pudo sincronizar la información corporativa.",
      );
    } finally {
      setCargando(false);
    }
  };

  if (!esAutorizado) {
    return (
      <AppScreen title="Acceso Denegado" subtitle="Aislamiento Multiempresa">
        <View style={styles.contenedorAlerta}>
          <Card>
            <ThemedText style={styles.titleAlerta}>
              Área Corporativa Protegida
            </ThemedText>
            <ThemedText style={styles.textAlerta}>
              Los metadatos financieros, códigos CNAE y parámetros del convenio
              colectivo de los tenants solo son accesibles para inspectores de
              trabajo y cuentas directivas.
            </ThemedText>
          </Card>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Organizaciones"
      subtitle={
        esGestoria
          ? "Control global multiempresa (Asesoría)"
          : "Ajustes de mi organización"
      }
    >
      <Row>
        <StatCard
          label="Entidades Registradas"
          value={empresas.length.toString()}
        />
        <StatCard
          label="Rol de Gestión"
          value={esGestoria ? "Gestoría" : "Tenant Admin"}
          tone="success"
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>Entidades Vinculadas</ThemedText>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={empresas}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.empresaItem}>
                <View style={styles.headerEmpresa}>
                  <ThemedText style={styles.razonSocial}>
                    {item.razon_social}
                  </ThemedText>
                  <View style={styles.badgeCif}>
                    <ThemedText style={styles.cifTexto}>{item.cif}</ThemedText>
                  </View>
                </View>

                {item.nombre_comercial && (
                  <ThemedText style={styles.nombreComercial}>
                    Firma: {item.nombre_comercial}
                  </ThemedText>
                )}

                <View style={styles.separador} />

                <View style={styles.gridDetalles}>
                  <View style={styles.filaDetalle}>
                    <ThemedText style={styles.detalleLabel}>
                      Convenio:
                    </ThemedText>
                    <ThemedText style={styles.detalleValue}>
                      {item.convenio_colectivo ?? "-"}
                    </ThemedText>
                  </View>
                  <View style={styles.filaDetalle}>
                    <ThemedText style={styles.detalleLabel}>
                      Código CNAE:
                    </ThemedText>
                    <ThemedText style={styles.detalleValue}>
                      {item.codigo_cnae ?? "-"}
                    </ThemedText>
                  </View>
                  <View style={styles.filaDetalle}>
                    <ThemedText style={styles.detalleLabel}>
                      Zona Horaria:
                    </ThemedText>
                    <ThemedText style={styles.detalleValue}>
                      {item.zona_horaria}
                    </ThemedText>
                  </View>
                  <View style={styles.filaDetalle}>
                    <ThemedText style={styles.detalleLabel}>
                      Dirección:
                    </ThemedText>
                    <ThemedText style={styles.detalleValue}>
                      {item.direccion_fiscal ?? "-"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Card>
          )}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  empresaItem: { width: "100%", paddingVertical: 4 },
  headerEmpresa: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  razonSocial: { fontSize: 16, fontWeight: "800", color: "#0F172A", flex: 1 },
  badgeCif: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cifTexto: { fontSize: 11, fontWeight: "700", color: "#475569" },
  nombreComercial: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  separador: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  gridDetalles: { gap: 8 },
  filaDetalle: { flexDirection: "row" },
  detalleLabel: {
    fontSize: 13,
    color: "#64748B",
    width: 110,
    fontWeight: "600",
  },
  detalleValue: { fontSize: 13, color: "#334155", fontWeight: "500", flex: 1 },
});
function obtenerEmpresas(): ItemEmpresa {
  throw new Error("Function not implemented.");
}
