import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { TipoRolEnum } from "@/src/constants/enums";
import { obtenerEmpresas } from "@/src/modules/empresas/api/services";
import { Empresa } from "@/src/modules/empresas/types/empresa";
import { obtenerRoles } from "@/src/modules/roles/api/services";
import { Rol } from "@/src/modules/roles/types/rol";
import { obtenerTodosLosUsuarios } from "@/src/modules/usuarios/api/services";
import { UsuarioResponse } from "@/src/modules/usuarios/types/usuario";
import { crearMembresiaUsuario, desactivarMembresiaUsuario, obtenerAsignacionesAuditores } from "@/src/modules/usuarios-empresas/api/services";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { EstadoCarga } from "@/src/modules/plataforma/components/PlatformUI";

type AsignacionAuditor = { id: string; usuario_id: string; empresa_id: string; rol_id: string };

export default function AuditoresPlataformaScreen() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAuditor[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rolAuditor = useMemo(() => roles.find((rol) => rol.tipo === TipoRolEnum.AUDITOR_ITSS), [roles]);
  const usuarioSeleccionado = usuarios.find((usuario) => usuario.id === usuarioId);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [listaEmpresas, listaUsuarios, listaRoles, membresiasAuditor] = await Promise.all([
        obtenerEmpresas(), obtenerTodosLosUsuarios(), obtenerRoles(), obtenerAsignacionesAuditores(),
      ]);
      setEmpresas(listaEmpresas); setUsuarios(listaUsuarios); setRoles(listaRoles);
      setEmpresaId((actual) => listaEmpresas.some((empresa) => empresa.id === actual) ? actual : listaEmpresas[0]?.id ?? "");
      const rolAuditorId = listaRoles.find((rol) => rol.tipo === TipoRolEnum.AUDITOR_ITSS)?.id;
      setAsignaciones(membresiasAuditor
        .filter((membresia) => membresia.rol_id === rolAuditorId && membresia.activo !== false && membresia.empresa_id)
        .map((membresia) => ({ id: membresia.id, usuario_id: membresia.usuario_id, empresa_id: membresia.empresa_id!, rol_id: membresia.rol_id })));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar las cuentas y empresas."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.trim().toLocaleLowerCase();
    return !texto || usuario.nombre.toLocaleLowerCase().includes(texto) || usuario.email.toLocaleLowerCase().includes(texto);
  });

  const asignar = async () => {
    if (!empresaId || !usuarioId || !rolAuditor) return;
    setGuardando(true);
    try {
      await crearMembresiaUsuario({ usuario_id: usuarioId, empresa_id: empresaId, rol_id: rolAuditor.id });
      setUsuarioId("");
      Alert.alert("Auditor asignado", `${usuarioSeleccionado?.nombre ?? "La cuenta"} ya tiene acceso de auditoría a la empresa seleccionada.`);
      await cargar();
    } catch (e) { Alert.alert("No se pudo asignar", e instanceof Error ? e.message : "Error al crear el acceso del auditor."); }
    finally { setGuardando(false); }
  };

  const revocar = (asignacion: AsignacionAuditor) => {
    Alert.alert("Retirar acceso", "¿Quieres retirar a este auditor el acceso a esta empresa?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Retirar", style: "destructive", onPress: () => void (async () => {
        try { await desactivarMembresiaUsuario(asignacion.id, asignacion.empresa_id); await cargar(); }
        catch (e) { Alert.alert("No se pudo retirar", e instanceof Error ? e.message : "Error al retirar el acceso."); }
      })() },
    ]);
  };

  return (
    <AppScreen title="Auditores" subtitle="Asignación de alcance de auditoría por empresa">
      <EstadoCarga cargando={cargando} error={error} onRetry={() => void cargar()} />
      {!cargando && !error ? <>
        <Card>
          <ThemedText style={styles.heading}>Asignar empresa a un auditor</ThemedText>
          <ThemedText>Empresa</ThemedText>
          <View style={styles.chips}>{empresas.map((empresa) => <Chip key={empresa.id} label={empresa.nombre_comercial} selected={empresaId === empresa.id} onPress={() => setEmpresaId(empresa.id)} />)}</View>
          <ThemedText>Cuenta de usuario existente</ThemedText>
          <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre o correo" style={styles.input} />
          <View style={styles.users}>{usuariosFiltrados.slice(0, 30).map((usuario) => <Pressable key={usuario.id} onPress={() => setUsuarioId(usuario.id)} style={[styles.user, usuarioId === usuario.id && styles.userSelected]}><ThemedText style={usuarioId === usuario.id ? styles.userSelectedText : undefined}>{usuario.nombre} · {usuario.email}</ThemedText></Pressable>)}</View>
          {usuariosFiltrados.length > 30 ? <ThemedText>Refina la búsqueda para ver las cuentas restantes.</ThemedText> : null}
          {!rolAuditor ? <ThemedText style={styles.warning}>No se encontró el rol Auditor ITSS configurado en la plataforma.</ThemedText> : null}
          <Pressable disabled={!empresaId || !usuarioId || !rolAuditor || guardando} onPress={() => void asignar()} style={[styles.primary, (!empresaId || !usuarioId || !rolAuditor || guardando) && styles.disabled]}>
            {guardando ? <ActivityIndicator color="white" /> : <ThemedText style={styles.primaryText}>Asignar auditor a la empresa</ThemedText>}
          </Pressable>
          <ThemedText style={styles.hint}>La asignación da acceso de auditor únicamente en la empresa elegida. El rol y sus permisos se controlan en la API.</ThemedText>
        </Card>
        <ThemedText style={styles.heading}>Asignaciones activas ({asignaciones.length})</ThemedText>
        {asignaciones.map((asignacion) => {
          const usuario = usuarios.find((item) => item.id === asignacion.usuario_id);
          const empresa = empresas.find((item) => item.id === asignacion.empresa_id);
          return <Card key={asignacion.id}>
            <ThemedText style={styles.assignmentTitle}>{usuario?.nombre ?? "Cuenta sin nombre"}</ThemedText>
            <ThemedText>{usuario?.email ?? asignacion.usuario_id}</ThemedText>
            <ThemedText>Empresa: {empresa?.nombre_comercial ?? asignacion.empresa_id}</ThemedText>
            <Pressable onPress={() => revocar(asignacion)} style={styles.revoke}><ThemedText style={styles.revokeText}>Retirar acceso a esta empresa</ThemedText></Pressable>
          </Card>;
        })}
        {!asignaciones.length ? <Card><ThemedText>No hay asignaciones de auditor activas o la API no devolvió membresías visibles.</ThemedText></Card> : null}
      </> : null}
    </AppScreen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}><ThemedText style={selected ? styles.chipTextSelected : undefined}>{label}</ThemedText></Pressable>;
}

const styles = StyleSheet.create({ heading: { fontSize: 18, fontWeight: "800" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11 }, chipSelected: { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" }, chipTextSelected: { color: "white", fontWeight: "700" }, input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12 }, users: { maxHeight: 220 }, user: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 10 }, userSelected: { backgroundColor: "#DBEAFE" }, userSelectedText: { color: "#1D4ED8", fontWeight: "700" }, primary: { alignItems: "center", backgroundColor: "#1D4ED8", padding: 13, borderRadius: 8 }, primaryText: { color: "white", fontWeight: "700" }, disabled: { opacity: 0.5 }, warning: { color: "#B45309" }, hint: { lineHeight: 20, opacity: 0.72 }, assignmentTitle: { fontWeight: "800", fontSize: 16 }, revoke: { alignSelf: "flex-start", paddingVertical: 7 }, revokeText: { color: "#B91C1C", fontWeight: "700" } });
