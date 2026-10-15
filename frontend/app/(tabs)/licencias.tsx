import { emitirLicencia, obtenerLicencias, revocarLicencia } from "@/src/modules/licencias/api/services";
import { CicloFacturacion, EmitirLicencia, Licencia, PlanLicencia } from "@/src/modules/licencias/types/licencia";
import { useSesion } from "@/src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

const planes: PlanLicencia[] = ["Básico", "Pro", "Enterprise"];
const ciclos: CicloFacturacion[] = ["Trial", "Mensual", "Anual"];

export default function LicenciasScreen() {
  const { tienePermiso } = useSesion();
  const { mostrarError, mostrarMensaje } = useAppModal();
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [plan, setPlan] = useState<PlanLicencia>("Básico");
  const [ciclo, setCiclo] = useState<CicloFacturacion>("Anual");
  const [fechaExpiracion, setFechaExpiracion] = useState("");
  const puedeConsultar = tienePermiso("licencias", "consultar");
  const puedeCrear = tienePermiso("licencias", "crear");
  const puedeRevocar = tienePermiso("licencias", "eliminar");

  const cargar = useCallback(async () => {
    if (!puedeConsultar) {
      setCargando(false);
      return;
    }
    try {
      setLicencias(await obtenerLicencias());
    } catch (error) {
      mostrarError("No se pudieron cargar las licencias.");
    } finally {
      setCargando(false);
    }
  }, [puedeConsultar, mostrarError]);

  useEffect(() => { void cargar(); }, [cargar]);

  const crear = async () => {
    if (!puedeCrear || !fechaExpiracion) {
      mostrarMensaje("Fecha necesaria", "Indica la fecha de expiración de la licencia.");
      return;
    }
    const payload: EmitirLicencia = {
      plan,
      ciclo,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_expiracion: fechaExpiracion,
    };
    setGuardando(true);
    try {
      const nueva = await emitirLicencia(payload);
      setLicencias((anteriores) => [nueva, ...anteriores]);
      setFechaExpiracion("");
      mostrarMensaje("Licencia emitida", `Código: ${nueva.codigo}`);
    } catch {
      mostrarError("No se pudo emitir la licencia.");
    } finally {
      setGuardando(false);
    }
  };

  const revocar = async (licencia: Licencia) => {
    if (!puedeRevocar || licencia.revocada_at) return;
    try {
      const actualizada = await revocarLicencia(licencia.id);
      setLicencias((anteriores) => anteriores.map((item) => item.id === actualizada.id ? actualizada : item));
    } catch {
      mostrarError("No se pudo revocar la licencia.");
    }
  };

  if (!puedeConsultar) {
    return <AppScreen title="Licencias"><ThemedText>Esta sección requiere permiso de consulta de licencias.</ThemedText></AppScreen>;
  }

  return (
    <AppScreen title="Licencias" subtitle="Emisión y control de códigos de licencia">
      <ScrollView contentContainerStyle={styles.contenido}>
        {puedeCrear && <Card>
          <ThemedText style={styles.titulo}>Emitir licencia</ThemedText>
          <ThemedText>Plan</ThemedText>
          <View style={styles.opciones}>{planes.map((item) => <Pressable key={item} onPress={() => setPlan(item)} style={[styles.opcion, plan === item && styles.seleccionada]}><ThemedText>{item}</ThemedText></Pressable>)}</View>
          <ThemedText>Ciclo</ThemedText>
          <View style={styles.opciones}>{ciclos.map((item) => <Pressable key={item} onPress={() => setCiclo(item)} style={[styles.opcion, ciclo === item && styles.seleccionada]}><ThemedText>{item}</ThemedText></Pressable>)}</View>
          <TextInput value={fechaExpiracion} onChangeText={setFechaExpiracion} placeholder="Fecha de expiración (AAAA-MM-DD)" style={styles.input} />
          <Pressable disabled={guardando} onPress={crear} style={styles.boton}><ThemedText style={styles.botonTexto}>{guardando ? "Emitiendo…" : "Emitir código"}</ThemedText></Pressable>
        </Card>}
        <ThemedText style={styles.titulo}>Licencias emitidas</ThemedText>
        {cargando ? <ActivityIndicator /> : licencias.map((item) => <Card key={item.id}>
          <ThemedText style={styles.codigo}>{item.codigo}</ThemedText>
          <ThemedText>{item.plan} · {item.ciclo} · {item.estado}</ThemedText>
          <ThemedText>Empresa asignada: {item.empresa_id ? "Sí" : "Pendiente de canje"}</ThemedText>
          <ThemedText>Válida hasta {item.fecha_expiracion}</ThemedText>
          {puedeRevocar && !item.revocada_at && <Pressable onPress={() => void revocar(item)} style={styles.botonSecundario}><ThemedText>Revocar licencia</ThemedText></Pressable>}
        </Card>)}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: 14, paddingBottom: 32 },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  opcion: { padding: 10, borderRadius: 8, backgroundColor: "#E2E8F0" },
  seleccionada: { backgroundColor: "#BFDBFE" },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, marginVertical: 10 },
  boton: { backgroundColor: "#2563EB", borderRadius: 8, padding: 12, alignItems: "center" },
  botonTexto: { color: "#FFFFFF", fontWeight: "700" },
  botonSecundario: { marginTop: 10, padding: 10, alignSelf: "flex-start", backgroundColor: "#FEE2E2", borderRadius: 8 },
  codigo: { fontWeight: "700", fontSize: 17, marginBottom: 4 },
});
