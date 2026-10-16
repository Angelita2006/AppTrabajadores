import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { obtenerCuadroMandosDiarioEmpresa } from "@/src/modules/resumenes-jornada/api/services";
import { ResumenJornada } from "@/src/modules/resumenes-jornada/types/resumen-jornada";
import { obtenerEmpresas } from "@/src/modules/empresas/api/services";
import { Empresa } from "@/src/modules/empresas/types/empresa";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { EstadoCarga, PlataformaGrid, PlataformaMetrica } from "@/src/modules/plataforma/components/PlatformUI";

function fechaLocal() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export default function InformesPlataformaScreen() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [fecha, setFecha] = useState(fechaLocal());
  const [resumenes, setResumenes] = useState<ResumenJornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerEmpresas().then((items) => { setEmpresas(items); setEmpresaId(items[0]?.id ?? ""); })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las empresas."))
      .finally(() => setCargando(false));
  }, []);

  const cargar = useCallback(async () => {
    if (!empresaId || !fecha) return;
    setCargando(true); setError(null);
    try { setResumenes(await obtenerCuadroMandosDiarioEmpresa(empresaId, fecha, empresaId)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el informe diario."); }
    finally { setCargando(false); }
  }, [empresaId, fecha]);
  useEffect(() => { if (empresaId) void cargar(); }, [cargar, empresaId]);

  const minutos = resumenes.reduce((total, item) => total + (item.minutos_trabajados || 0), 0);
  const incidencias = resumenes.filter((item) => item.tiene_incidencias).length;
  return (
    <AppScreen title="Informes de jornada" subtitle="Resumen diario de tiempo registrado por empresa">
      <View style={styles.chips}>{empresas.map((empresa) => <Pressable key={empresa.id} onPress={() => setEmpresaId(empresa.id)} style={[styles.chip, empresaId === empresa.id && styles.selected]}><ThemedText style={empresaId === empresa.id ? styles.selectedText : undefined}>{empresa.nombre_comercial}</ThemedText></Pressable>)}</View>
      <View style={styles.dateRow}><TextInput value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" style={styles.input} /><Pressable onPress={() => void cargar()} style={styles.button}><ThemedText style={styles.buttonText}>Consultar</ThemedText></Pressable></View>
      <EstadoCarga cargando={cargando} error={error} />
      {!cargando && !error ? <>
        <PlataformaGrid>
          <PlataformaMetrica label="Registros" value={resumenes.length} />
          <PlataformaMetrica label="Horas registradas" value={`${(minutos / 60).toFixed(1)} h`} />
          <PlataformaMetrica label="Incidencias" value={incidencias} />
        </PlataformaGrid>
        {resumenes.length ? resumenes.map((item) => <Card key={item.id}>
          <ThemedText style={styles.name}>{item.trabajador ? `${item.trabajador.nombre} ${item.trabajador.apellidos}` : item.trabajador_id}</ThemedText>
          <ThemedText>{item.hora_entrada} – {item.hora_salida} · {(item.minutos_trabajados / 60).toFixed(2)} h</ThemedText>
          <ThemedText>Pausa: {item.minutos_pausa} min · Extra: {item.minutos_extra} min · {item.tiene_incidencias ? "Con incidencias" : "Sin incidencias"}</ThemedText>
        </Card>) : <Card><ThemedText>No hay resúmenes para esa fecha.</ThemedText></Card>}
      </> : null}
      {cargando ? <ActivityIndicator /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, selected: { borderColor: "#1D4ED8", backgroundColor: "#1D4ED8" }, selectedText: { color: "white", fontWeight: "700" }, dateRow: { flexDirection: "row", alignItems: "center", gap: 8 }, input: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", padding: 12, borderRadius: 8 }, button: { backgroundColor: "#1D4ED8", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }, buttonText: { color: "white", fontWeight: "700" }, name: { fontWeight: "800", fontSize: 16 } });
