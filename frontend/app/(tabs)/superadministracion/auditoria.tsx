import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { obtenerAuditoriaEmpresa } from "@/src/modules/auditoria-accesos/api/services";
import { AuditoriaAccesoResponse } from "@/src/modules/auditoria-accesos/types/auditoria-acceso";
import { obtenerEmpresas } from "@/src/modules/empresas/api/services";
import { Empresa } from "@/src/modules/empresas/types/empresa";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { EstadoCarga } from "@/src/modules/plataforma/components/PlatformUI";

export default function AuditoriaPlataformaScreen() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [eventos, setEventos] = useState<AuditoriaAccesoResponse[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerEmpresas().then((items) => { setEmpresas(items); setEmpresaId(items[0]?.id ?? ""); })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las empresas."))
      .finally(() => setCargandoEmpresas(false));
  }, []);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setCargandoEventos(true); setError(null);
    try { setEventos(await obtenerAuditoriaEmpresa(empresaId, empresaId)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la auditoría."); }
    finally { setCargandoEventos(false); }
  }, [empresaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <AppScreen title="Auditoría de accesos" subtitle="Eventos registrados para las organizaciones">
      {cargandoEmpresas ? <ActivityIndicator /> : null}
      <View style={styles.chips}>{empresas.map((empresa) => <Pressable key={empresa.id} onPress={() => setEmpresaId(empresa.id)} style={[styles.chip, empresaId === empresa.id && styles.selected]}><ThemedText style={empresaId === empresa.id ? styles.selectedText : undefined}>{empresa.nombre_comercial}</ThemedText></Pressable>)}</View>
      <EstadoCarga cargando={cargandoEventos} error={error} onRetry={() => void cargar()} />
      {!cargandoEventos && !error && !eventos.length ? <Card><ThemedText>No hay eventos de auditoría para esta empresa.</ThemedText></Card> : null}
      {eventos.map((evento) => <Card key={evento.id}>
        <View style={styles.row}><ThemedText style={styles.title}>{evento.accion}</ThemedText><ThemedText>{new Date(evento.fecha_hora).toLocaleString()}</ThemedText></View>
        <ThemedText>Usuario: {evento.usuario?.email ?? evento.usuario_id ?? "Sistema"}</ThemedText>
        {evento.trabajador ? <ThemedText>Trabajador: {evento.trabajador.nombre} {evento.trabajador.apellidos}</ThemedText> : null}
        {evento.ip_address ? <ThemedText>IP: {evento.ip_address}</ThemedText> : null}
        {evento.detalle ? <ThemedText style={styles.details}>{JSON.stringify(evento.detalle)}</ThemedText> : null}
      </Card>)}
    </AppScreen>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, selected: { borderColor: "#1D4ED8", backgroundColor: "#1D4ED8" }, selectedText: { color: "white", fontWeight: "700" }, row: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }, title: { fontWeight: "800" }, details: { fontSize: 12, opacity: 0.75 } });
