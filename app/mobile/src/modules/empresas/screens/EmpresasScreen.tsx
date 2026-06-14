import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { obtenerEmpresas } from "@/modules/empresas/api/empresasService";
import { Empresa } from "@/modules/empresas/types/empresa";
import { useTrabajador } from "@/modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "@/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/shared/ui/AppSurface";

export default function EmpresasScreen() {
  const {
    trabajadorActual,
    empresaSeleccionada,
    setEmpresaSeleccionada,
    setEmpresas,
  } = useTrabajador();
  const [empresas, setListaEmpresas] = useState<Empresa[]>([]);

  const cargar = useCallback(async () => {
    const data = await obtenerEmpresas();
    const visibles =
      trabajadorActual?.role === "admin"
        ? data
        : data.filter((empresa) =>
            empresa.trabajadores?.includes(trabajadorActual?.id ?? 0),
          );
    setListaEmpresas(visibles);
    setEmpresas(visibles);
    if (!empresaSeleccionada && visibles[0]) setEmpresaSeleccionada(visibles[0]);
  }, [empresaSeleccionada, setEmpresaSeleccionada, setEmpresas, trabajadorActual]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <AppScreen
      title="Empresas"
      subtitle="Selecciona la empresa activa para fichajes, horarios e incidencias."
    >
      <Row>
        <StatCard label="Empresas visibles" value={String(empresas.length)} />
        <StatCard label="Empresa activa" value={empresaSeleccionada?.nombre ?? "Sin seleccionar"} tone="success" />
      </Row>
      <View style={styles.grid}>
        {empresas.map((empresa) => {
          const selected = empresaSeleccionada?.id === empresa.id;
          return (
            <Card key={empresa.id}>
              <View style={styles.companyHeader}>
                <View style={styles.logo}>
                  <ThemedText style={styles.logoText}>{empresa.nombre.slice(0, 2).toUpperCase()}</ThemedText>
                </View>
                <View style={styles.companyInfo}>
                  <ThemedText style={styles.title}>{empresa.nombre}</ThemedText>
                  <ThemedText style={styles.meta}>{empresa.cif}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.body}>
                {empresa.direccion}, {empresa.poblacion} ({empresa.provincia})
              </ThemedText>
              <ThemedText style={styles.body}>
                {empresa.trabajadores?.length ?? 0} trabajadores vinculados
              </ThemedText>
              <Pressable
                style={[styles.button, selected && styles.buttonSelected]}
                onPress={() => setEmpresaSeleccionada(empresa)}
              >
                <ThemedText style={styles.buttonText}>
                  {selected ? "Empresa activa" : "Usar esta empresa"}
                </ThemedText>
              </Pressable>
            </Card>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12,
  },
  companyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  logo: {
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  logoText: {
    color: "#1D4ED8",
    fontWeight: "900",
  },
  companyInfo: {
    flex: 1,
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  meta: {
    color: "#64748B",
  },
  body: {
    color: "#475569",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    padding: 12,
  },
  buttonSelected: {
    backgroundColor: "#16A34A",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
});
