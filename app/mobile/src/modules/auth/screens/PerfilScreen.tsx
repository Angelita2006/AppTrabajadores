import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  getTrabajadorByEmailYPassword,
  obtenerEmpresasTrabajador,
} from "../../../modules/trabajadores/api/trabajadoresService";
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";

export default function PerfilScreen() {
  const {
    trabajadorActual,
    setTrabajadorActual,
    setEmpresas,
    setEmpresaSeleccionada,
    empresaSeleccionada,
  } = useTrabajador();
  const [email, setEmail] = useState(
    trabajadorActual?.email ?? "admin@app.test",
  );
  const [password, setPassword] = useState("admin123");

  const login = async () => {
    try {
      const trabajador = await getTrabajadorByEmailYPassword(email, password);
      const empresas = await obtenerEmpresasTrabajador(trabajador.id);
      setTrabajadorActual(trabajador);
      setEmpresas(empresas);
      setEmpresaSeleccionada(empresas[0] ?? null);
    } catch {
      Alert.alert(
        "Login demo",
        "Usa admin@app.test / admin123 o carlos@app.test / demo123",
      );
    }
  };

  const logout = () => {
    setTrabajadorActual(null);
    setEmpresas([]);
    setEmpresaSeleccionada(null);
  };

  return (
    <AppScreen
      title="Perfil y acceso"
      subtitle="Sesión demo en memoria. No se guarda nada en servidor."
    >
      <Row>
        <StatCard
          label="Usuario"
          value={trabajadorActual?.nombre ?? "Sin sesión"}
          tone={trabajadorActual ? "success" : "warning"}
        />
        <StatCard label="Rol" value={trabajadorActual?.role ?? "-"} />
        <StatCard
          label="Empresa activa"
          value={empresaSeleccionada?.nombre ?? "-"}
        />
      </Row>

      <Card>
        <ThemedText style={styles.title}>Acceso rápido</ThemedText>
        <View style={styles.formRow}>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Contraseña</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
            />
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={login}>
            <ThemedText style={styles.buttonText}>Entrar</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <ThemedText style={styles.secondaryButtonText}>
              Cerrar sesión
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText style={styles.help}>
          Credenciales demo: admin@app.test / admin123 · carlos@app.test /
          demo123
        </ThemedText>
      </Card>

      {trabajadorActual ? (
        <Card>
          <ThemedText style={styles.title}>Datos del trabajador</ThemedText>
          <View style={styles.detailGrid}>
            <Detail
              label="Nombre"
              value={`${trabajadorActual.nombre} ${trabajadorActual.apellidos}`}
            />
            <Detail label="DNI" value={trabajadorActual.dni} />
            <Detail label="Puesto" value={trabajadorActual.puesto} />
            <Detail
              label="Localidad"
              value={`${trabajadorActual.poblacion}, ${trabajadorActual.provincia}`}
            />
            <Detail
              label="Cuenta cotización"
              value={trabajadorActual.cuenta_cotizacion}
            />
            <Detail label="Email" value={trabajadorActual.email} />
          </View>
        </Card>
      ) : null}
    </AppScreen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  formRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  field: {
    flexGrow: 1,
    minWidth: 220,
  },
  label: {
    color: "#475569",
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "800",
  },
  help: {
    color: "#64748B",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detail: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    minWidth: 220,
    padding: 12,
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 4,
  },
});
