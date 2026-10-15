import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { confirmarCompraCheckout } from "@/src/modules/licencias/api/services";

type CompraConfirmada = Awaited<ReturnType<typeof confirmarCompraCheckout>>;

export default function ConfirmacionCheckoutScreen() {
  const router = useRouter();
  const { session_id: sessionId } = useLocalSearchParams<{ session_id?: string }>();
  const [compra, setCompra] = useState<CompraConfirmada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const confirmar = useCallback(async () => {
    if (!sessionId || Array.isArray(sessionId)) {
      setError("No se encontró la referencia de la compra.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      setCompra(await confirmarCompraCheckout(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo verificar el pago.");
    } finally {
      setCargando(false);
    }
  }, [sessionId]);

  useEffect(() => { void confirmar(); }, [confirmar]);

  return (
    <AppScreen title="Confirmación de compra" subtitle="Estamos verificando el estado del pago y preparando tu licencia.">
      <View style={styles.contenedor}>
        <Card>
          {cargando ? <ActivityIndicator accessibilityLabel="Verificando el pago" size="large" /> : compra ? (
            <View style={styles.contenido}>
              <ThemedText style={styles.titulo}>Compra confirmada</ThemedText>
              <ThemedText>Plan: {compra.plan}</ThemedText>
              <ThemedText>Facturación: {compra.ciclo}</ThemedText>
              <ThemedText style={styles.etiqueta}>Código de licencia</ThemedText>
              <ThemedText selectable style={styles.codigo}>{compra.codigo}</ThemedText>
              <ThemedText style={styles.ayuda}>Guarda este código. Lo necesitarás para registrar la empresa con el correo usado en el pago.</ThemedText>
              <Pressable accessibilityRole="button" style={styles.boton} onPress={() => router.replace({ pathname: "/(authentication)/registro-empresa", params: { codigo_licencia: compra.codigo } })}>
                <ThemedText style={styles.textoBoton}>Registrar mi empresa</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.contenido}>
              <ThemedText accessibilityRole="alert" style={styles.error}>{error ?? "No se pudo verificar la compra."}</ThemedText>
              <ThemedText style={styles.ayuda}>Si el banco confirmó el pago, espera unos segundos y vuelve a intentarlo.</ThemedText>
              <Pressable accessibilityRole="button" style={styles.boton} onPress={() => void confirmar()}>
                <ThemedText style={styles.textoBoton}>Volver a comprobar</ThemedText>
              </Pressable>
              <Pressable accessibilityRole="link" style={styles.enlace} onPress={() => router.replace("/planes")}>
                <ThemedText>Volver a los planes</ThemedText>
              </Pressable>
            </View>
          )}
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedor: { width: "100%", maxWidth: 620, alignSelf: "center" },
  contenido: { alignItems: "center", gap: 12 },
  titulo: { fontSize: 24, fontWeight: "800" },
  etiqueta: { marginTop: 8, fontWeight: "700" },
  codigo: { fontSize: 24, fontWeight: "900", letterSpacing: 2, color: "#1D4ED8" },
  ayuda: { textAlign: "center", lineHeight: 21, opacity: 0.75 },
  error: { textAlign: "center", color: "#B91C1C", lineHeight: 22 },
  boton: { width: "100%", marginTop: 12, borderRadius: 10, padding: 14, alignItems: "center", backgroundColor: "#1D4ED8" },
  textoBoton: { color: "#FFFFFF", fontWeight: "700" },
  enlace: { padding: 10 },
});
