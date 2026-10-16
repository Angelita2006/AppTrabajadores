import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { obtenerTodasEmpresasPlataforma, obtenerTrabajadoresEmpresa } from "@/src/modules/empresas/api/services";
import { Empresa } from "@/src/modules/empresas/types/empresa";
import { obtenerAutorizacionesGestorias, crearAutorizacionGestoria } from "@/src/modules/gestorias-empresas/api/services";
import { GestoriaEmpresaResponse } from "@/src/modules/gestorias-empresas/types/gestoria-empresa";
import { useSesion } from "@/src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { EstadoCarga } from "@/src/modules/plataforma/components/PlatformUI";

type TrabajadorEmpresa = { id: string; nombre: string; apellidos: string; dni_nif_nie: string; usuario_id?: string | null; estado?: string };

export default function DetalleEmpresaPlataformaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setEmpresaActual } = useSesion();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorEmpresa[]>([]);
  const [relaciones, setRelaciones] = useState<GestoriaEmpresaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true); setError(null);
    try {
      const [listaEmpresas, listaTrabajadores, listaRelaciones] = await Promise.all([
        obtenerTodasEmpresasPlataforma(), obtenerTrabajadoresEmpresa(id, id), obtenerAutorizacionesGestorias(id),
      ]);
      setEmpresas(listaEmpresas);
      setEmpresa(listaEmpresas.find((item) => item.id === id) ?? null);
      setTrabajadores(listaTrabajadores as TrabajadorEmpresa[]);
      setRelaciones(listaRelaciones);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la empresa."); }
    finally { setCargando(false); }
  }, [id]);
  useEffect(() => { void cargar(); }, [cargar]);

  const abrirGestion = () => {
    if (!empresa) return;
    setEmpresaActual(empresa);
    router.push("/(tabs)/empresa");
  };

  const vincularCliente = async (cliente: Empresa) => {
    if (!empresa) return;
    try {
      const ahora = new Date();
      const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
      await crearAutorizacionGestoria({ empresa_cliente_id: cliente.id, fecha_inicio: hoy, fecha_fin: null }, empresa.id);
      Alert.alert("Cliente vinculado", `${cliente.nombre_comercial} se ha vinculado a la gestoría.`);
      await cargar();
    } catch (e) { Alert.alert("No se pudo vincular", e instanceof Error ? e.message : "Error al crear la relación."); }
  };

  const clientesVinculados = relaciones.filter((relacion) => relacion.empresa_gestora_id === id);
  const candidatos = empresas.filter((item) => !item.es_gestoria && item.id !== id && !clientesVinculados.some((relacion) => relacion.empresa_cliente_id === item.id));

  return (
    <AppScreen title={empresa?.nombre_comercial ?? "Empresa"} subtitle="Ficha global y acceso a su gestión operativa">
      <EstadoCarga cargando={cargando} error={error} onRetry={() => void cargar()} />
      {!cargando && empresa ? <>
        <Card>
          <View style={styles.row}><ThemedText style={styles.title}>Datos de organización</ThemedText><ThemedText style={empresa.activa ? styles.active : styles.inactive}>{empresa.activa ? "Activa" : "Inactiva"}</ThemedText></View>
          <ThemedText>{empresa.razon_social}</ThemedText>
          <ThemedText>CIF: {empresa.cif}</ThemedText>
          <ThemedText>Tipo: {empresa.es_gestoria ? "Gestoría" : "Empresa cliente"}</ThemedText>
          <ThemedText>Zona horaria: {empresa.zona_horaria}</ThemedText>
          <Pressable onPress={abrirGestion} style={styles.primary}><ThemedText style={styles.primaryText}>Abrir gestión completa de esta empresa</ThemedText></Pressable>
        </Card>

        <Card>
          <ThemedText style={styles.title}>Accesos rápidos</ThemedText>
          <ThemedText>Selecciona la empresa antes de abrir cada módulo; la API seguirá comprobando los permisos en cada operación.</ThemedText>
          <View style={styles.shortcuts}>
            <Shortcut label="Fichajes" onPress={() => { setEmpresaActual(empresa); router.push("/(tabs)/fichajes"); }} />
            <Shortcut label="Ausencias" onPress={() => { setEmpresaActual(empresa); router.push("/(tabs)/gestion-ausencias"); }} />
            <Shortcut label="Correcciones" onPress={() => { setEmpresaActual(empresa); router.push("/(tabs)/gestion-incidencias"); }} />
            <Shortcut label="Turnos" onPress={() => { setEmpresaActual(empresa); router.push("/(tabs)/horarios"); }} />
            <Shortcut label="Informes" onPress={() => router.push("/(tabs)/superadministracion/informes") } />
            <Shortcut label="Auditoría" onPress={() => router.push("/(tabs)/superadministracion/auditoria") } />
          </View>
        </Card>

        <Card>
          <ThemedText style={styles.title}>Plantilla ({trabajadores.length})</ThemedText>
          {trabajadores.length ? trabajadores.map((trabajador) => <View key={trabajador.id} style={styles.listRow}><ThemedText style={styles.workerName}>{trabajador.nombre} {trabajador.apellidos}</ThemedText><ThemedText>{trabajador.dni_nif_nie} · {trabajador.estado ?? "Sin estado"}</ThemedText></View>) : <ThemedText>No hay trabajadores disponibles para esta empresa.</ThemedText>}
        </Card>

        {empresa.es_gestoria ? <Card>
          <ThemedText style={styles.title}>Empresas cliente ({clientesVinculados.length})</ThemedText>
          {clientesVinculados.map((relacion) => <View key={relacion.id} style={styles.listRow}><ThemedText style={styles.workerName}>{empresas.find((item) => item.id === relacion.empresa_cliente_id)?.nombre_comercial ?? relacion.empresa_cliente_id}</ThemedText><ThemedText>Desde {relacion.fecha_inicio}{relacion.fecha_fin ? ` · Hasta ${relacion.fecha_fin}` : " · Sin fecha fin"}</ThemedText></View>)}
          {!clientesVinculados.length ? <ThemedText>Esta gestoría todavía no tiene clientes vinculados.</ThemedText> : null}
          <ThemedText style={styles.subheading}>Vincular una empresa cliente</ThemedText>
          {candidatos.slice(0, 12).map((cliente) => <Pressable key={cliente.id} onPress={() => void vincularCliente(cliente)} style={styles.clientButton}><ThemedText>{cliente.nombre_comercial} · {cliente.cif}</ThemedText><ThemedText style={styles.link}>Vincular</ThemedText></Pressable>)}
          {candidatos.length > 12 ? <ThemedText>Hay más empresas; la lista muestra las primeras 12.</ThemedText> : null}
        </Card> : null}
      </> : null}
      {cargando ? <ActivityIndicator /> : null}
    </AppScreen>
  );
}

function Shortcut({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.shortcut}><ThemedText style={styles.shortcutText}>{label}</ThemedText></Pressable>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, title: { fontSize: 18, fontWeight: "800" }, active: { color: "#15803D", fontWeight: "700" }, inactive: { color: "#B91C1C", fontWeight: "700" }, primary: { marginTop: 8, padding: 14, borderRadius: 9, backgroundColor: "#1D4ED8", alignItems: "center" }, primaryText: { color: "white", fontWeight: "700" }, listRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0", gap: 3 }, workerName: { fontWeight: "700" }, subheading: { fontWeight: "700", marginTop: 14, marginBottom: 5 }, clientButton: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0", flexDirection: "row", justifyContent: "space-between", gap: 8 }, link: { color: "#2563EB", fontWeight: "700" }, shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, shortcut: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: "#EFF6FF" }, shortcutText: { color: "#1D4ED8", fontWeight: "700" } });
