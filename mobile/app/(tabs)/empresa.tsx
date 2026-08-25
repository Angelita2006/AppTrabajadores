import { obtenerCalendariosYFestivos } from "@/src/modules/calendarios-laborales/api/services";
import { CalendarioFestivo } from "@/src/modules/calendarios-laborales/types/calendario";
import { obtenerCentrosPorEmpresa } from "@/src/modules/centros-trabajo/api/services";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { obtenerDepartamentosEmpresa } from "@/src/modules/departamentos/api/services";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import { obtenerDispositivosEmpresa } from "@/src/modules/dispositivos-fichaje/api/services";
import { Dispositivo } from "@/src/modules/dispositivos-fichaje/types/dispositivo-fichaje";
import {
  actualizarLogoEmpresa,
  guardarDatosEmpresa,
  obtenerEmpresas,
  obtenerUrlLogo,
} from "@/src/modules/empresas/api/services";
import TabCalendario from "@/src/modules/empresas/components/CalendariosTab";
import TabCentros from "@/src/modules/empresas/components/CentrosTab";
import TabDepartamentos from "@/src/modules/empresas/components/DepartamentosTab";
import TabDispositivos from "@/src/modules/empresas/components/DispositivosTab";
import TabFiscal from "@/src/modules/empresas/components/FiscalTab";
import TabRoles from "@/src/modules/empresas/components/RolesTab";
import TabTipoEventos from "@/src/modules/empresas/components/TiposFichajesTab";
import TabTurnos from "@/src/modules/empresas/components/TurnosTab";
import { obtenerRolesEmpresa } from "@/src/modules/roles/api/services";
import { Rol } from "@/src/modules/roles/types/rol";
import { obtenerTiposEventosEmpresa } from "@/src/modules/tipos_eventos_fichaje/api/services";
import { TipoEventoFichaje } from "@/src/modules/tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { obtenerTurnosEmpresa } from "@/src/modules/turnos/api/services";
import { Turno } from "@/src/modules/turnos/types/turno";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Empresa } from "../../src/modules/empresas/types/empresa";
import { useSesion } from "../../src/modules/usuarios/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

type TabConfig =
  | "fiscal"
  | "centros"
  | "turnos"
  | "departamentos"
  | "calendario"
  | "dispositivos"
  | "tipoeventos"
  | "roles";

export default function EmpresasScreen() {
  const { usuarioActual, empresaSeleccionada, setEmpresaSeleccionada } =
    useSesion();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [centrosEmpresa, setCentrosEmpresa] = useState<CentroTrabajo[]>([]);
  const [turnosEmpresa, setTurnosEmpresa] = useState<Turno[]>([]);
  const [departamentosEmpresa, setDepartamentosEmpresa] = useState<
    Departamento[]
  >([]);
  const [calendariosEmpresa, setCalendariosEmpresa] = useState<
    CalendarioFestivo[]
  >([]);
  const [dispositivosEmpresa, setDispositivosEmpresa] = useState<Dispositivo[]>(
    [],
  );
  const [tiposEventosEmpresa, setTiposEventosEmpresa] = useState<
    TipoEventoFichaje[]
  >([]);
  const [rolesEmpresa, setRolesEmpresa] = useState<Rol[]>([]);

  const [tabActiva, setTabActiva] = useState<TabConfig>("fiscal");

  // ESTADOS: Datos Fiscales
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [convenioInput, setConvenioInput] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [direccionInput, setDireccionInput] = useState("");

  // ESTADOS PARA CALENDARIO
  const [calendarioSeleccionado, setCalendarioSeleccionado] =
    useState<CalendarioFestivo | null>(null);
  const [editAnio, setEditAnio] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editCentroId, setEditCentroId] = useState<string | null>(null);

  // Estados para roles
  const esGestoria = usuarioActual?.tipo_usuario === "Admin_gestoría";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "Admin_empresa";
  const esAutorizado = esGestoria || esAdminEmpresa;

  // Estados para la gestión de la entidad y su logo corporativo
  const [logoUrlInput, setLogoUrlInput] = useState("");

  // Sincronizar el input del logo cada vez que cambie la empresa seleccionada
  useEffect(() => {
    if (empresaSeleccionada) {
      setLogoUrlInput(empresaSeleccionada.logo_url || "");
    }
  }, [empresaSeleccionada]);

  useEffect(() => {
    if (esAutorizado) {
      cargarCatalogoEmpresas();
    }
  }, [esAutorizado]);

  useEffect(() => {
    if (empresaSeleccionada) {
      setRazonSocialInput(empresaSeleccionada.razon_social || "");
      setConvenioInput(empresaSeleccionada.convenio_colectivo || "");
      setCnaeInput(empresaSeleccionada.codigo_cnae || "");
      setDireccionInput(empresaSeleccionada.direccion_fiscal || "");

      cargarDatosEmpresa(empresaSeleccionada.id);
    }
  }, [empresaSeleccionada]);

  const cargarDatosEmpresa = async (empresaId: string) => {
    try {
      setCargando(true);
      const [
        datosCentros,
        datosCalendarios,
        datosTurnos,
        datosDepartamentos,
        datosDispositivos,
        datosTiposEventos,
        datosRoles,
      ] = await Promise.all([
        obtenerCentrosPorEmpresa(empresaId),
        obtenerCalendariosYFestivos(empresaId),
        obtenerTurnosEmpresa(empresaId),
        obtenerDepartamentosEmpresa(empresaId),
        obtenerDispositivosEmpresa(empresaId),
        obtenerTiposEventosEmpresa(empresaId),
        obtenerRolesEmpresa(empresaId),
      ]);

      setCentrosEmpresa(datosCentros);
      setCalendariosEmpresa(datosCalendarios);
      setTurnosEmpresa(datosTurnos);
      setDepartamentosEmpresa(datosDepartamentos);
      setDispositivosEmpresa(datosDispositivos);
      setTiposEventosEmpresa(datosTiposEventos);
      setRolesEmpresa(datosRoles);

      if (datosCalendarios.length > 0) {
        const primerCalendario: CalendarioFestivo = datosCalendarios[0];
        setCalendarioSeleccionado(primerCalendario);
        setEditAnio(primerCalendario.anio.toString());
        setEditNombre(primerCalendario.nombre || "");
        setEditCentroId(primerCalendario.centro_trabajo_id || "");
      }
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error al cargar datos de empresa: ${error}`);
      } else {
        Alert.alert("Error de Carga", mensajeAmigable);
      }
    } finally {
      setCargando(false);
    }
  };

  const cargarCatalogoEmpresas = async () => {
    try {
      setCargando(true);
      const todasLasEmpresas = await obtenerEmpresas();
      let empresasPermitidas = esGestoria
        ? todasLasEmpresas
        : todasLasEmpresas.filter(
            (e: Empresa) => e.id === usuarioActual?.empresa_id,
          );

      setEmpresas(empresasPermitidas);
      if (
        empresasPermitidas.length > 0 &&
        !empresaSeleccionada &&
        setEmpresaSeleccionada
      ) {
        setEmpresaSeleccionada(empresasPermitidas[0]);
      }
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error Saas: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error Saas", mensajeAmigable);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarDatosEmpresa = async () => {
    if (!empresaSeleccionada) return;
    try {
      setGuardando(true);
      await guardarDatosEmpresa(
        empresaSeleccionada.id,
        razonSocialInput.trim(),
        convenioInput.trim(),
        cnaeInput.trim(),
        direccionInput.trim(),
      );
      Alert.alert("Éxito", "Parámetros fiscales actualizados correctamente.");
      await cargarCatalogoEmpresas();
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarLogo = async (empresa: Empresa) => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("Se requieren permisos para acceder a la galería de fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;

      try {
        const empresaActualizada = await actualizarLogoEmpresa(
          empresa.id,
          localUri,
        );

        // Añadimos el timestamp para evitar la caché de React Native
        if (empresaActualizada && empresaActualizada.logo_url) {
          empresaActualizada.logo_url = `${empresaActualizada.logo_url}?t=${new Date().getTime()}`;
        }

        // 1. Si tienes una lista de empresas, actualízala aquí para que el item cambie visualmente:
        setEmpresas((prevEmpresas: Empresa[]) =>
          prevEmpresas.map((e: Empresa) =>
            e.id === empresaActualizada.id ? empresaActualizada : e,
          ),
        );

        // 2. Actualizamos el estado seleccionado si existe
        if (setEmpresaSeleccionada) {
          setEmpresaSeleccionada(empresaActualizada);
        }

        if (Platform.OS === "web") {
          alert("¡Logo actualizado correctamente!");
        } else {
          Alert.alert("Éxito", "¡Logo actualizado correctamente!");
        }
      } catch (error: any) {
        const mensajeBackend =
          error?.response?.data?.detail ||
          error?.message ||
          error ||
          "Error desconocido de red";
        alert("No se pudo subir la imagen al servidor. " + mensajeBackend);
      }
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
              Los metadatos financieros, códigos CNAE y configuraciones de
              estructura empresarial son exclusivos para cuentas directivas.
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
          : "Estructura y Parámetros Operativos"
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Row>
          <StatCard
            label="Entidades Accesibles"
            value={empresas.length.toString()}
          />
          <StatCard
            label="Rol de Gestión"
            value={esGestoria ? "Gestoría" : "Admin"}
            tone="success"
          />
        </Row>

        <ThemedText style={styles.sectionTitle}>
          {esGestoria
            ? "Selecciona una Entidad Vinculada"
            : "Tu Entidad Corporativa"}
        </ThemedText>

        {cargando ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={empresas}
            keyExtractor={(item: Empresa) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const estaSeleccionada = empresaSeleccionada?.id === item.id;
              return (
                <Pressable
                  onPress={
                    esGestoria && empresas.length > 1
                      ? () => setEmpresaSeleccionada?.(item)
                      : undefined
                  }
                  style={[
                    styles.tarjetaInteractiva,
                    estaSeleccionada && styles.tarjetaSeleccionada,
                  ]}
                >
                  <Card>
                    <View style={styles.headerEmpresa}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          flex: 1,
                        }}
                      >
                        <Pressable
                          onPress={() => handleCambiarLogo(item)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: "#CBD5E1",
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "#F8FAFC",
                            overflow: "hidden",
                          }}
                        >
                          {item.logo_url ? (
                            <Image
                              source={{
                                uri: obtenerUrlLogo(item.logo_url) || undefined,
                              }}
                              style={{ width: 36, height: 36 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <ThemedText style={{ fontSize: 14 }}>🏢</ThemedText>
                          )}
                        </Pressable>
                        <ThemedText
                          style={[styles.nombreComercial, { flex: 1 }]}
                          numberOfLines={1}
                        >
                          {item.nombre_comercial} {estaSeleccionada && "🔹"}
                        </ThemedText>
                      </View>
                      <View style={styles.badgeCif}>
                        <ThemedText style={styles.cifTexto}>
                          {item.cif}
                        </ThemedText>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}

        {/* ======================================================== */}
        {/* PESTAÑAS DE NAVEGACIÓN (TABS) */}
        {/* ======================================================== */}
        {empresaSeleccionada && (
          <View style={styles.contenedorTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: "fiscal", label: "Fiscal" },
                { key: "centros", label: "Centros de Trabajo" },
                { key: "turnos", label: "Turnos" },
                { key: "departamentos", label: "Departamentos" },
                { key: "calendario", label: "Calendario Laboral" },
                { key: "dispositivos", label: "Dispositivos" },
                { key: "tipoeventos", label: "Tipos de Fichaje" },
                { key: "roles", label: "Roles" },
              ].map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    tabActiva === tab.key && styles.tabButtonActivo,
                  ]}
                  onPress={() => setTabActiva(tab.key as TabConfig)}
                >
                  <ThemedText
                    style={[
                      styles.tabTexto,
                      tabActiva === tab.key && styles.tabTextoActivo,
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ======================================================== */}
        {/* CONTENIDO DINÁMICO DE LAS TABS (MODULARIZADO) */}
        {/* ======================================================== */}
        {empresaSeleccionada && (
          <View style={{ marginTop: 14 }}>
            <Card>
              {tabActiva === "fiscal" && (
                <TabFiscal
                  {...{
                    razonSocialInput,
                    setRazonSocialInput,
                    convenioInput,
                    setConvenioInput,
                    cnaeInput,
                    setCnaeInput,
                    direccionInput,
                    setDireccionInput,
                    handleGuardarDatosEmpresa,
                    guardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "centros" && (
                <TabCentros
                  {...{
                    centrosEmpresa,
                    setCentrosEmpresa,
                    empresaSeleccionada,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "turnos" && (
                <TabTurnos
                  {...{
                    turnosEmpresa,
                    setTurnosEmpresa,
                    empresaSeleccionada,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "departamentos" && (
                <TabDepartamentos
                  {...{
                    departamentosEmpresa,
                    setDepartamentosEmpresa,
                    empresaSeleccionada,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "calendario" && (
                <TabCalendario
                  {...{
                    calendariosEmpresa,
                    setCalendariosEmpresa,
                    centrosEmpresa,
                    empresaSeleccionada,
                    calendarioSeleccionado,
                    setCalendarioSeleccionado,
                    editAnio,
                    editNombre,
                    editCentroId,
                    setEditAnio,
                    setEditNombre,
                    setEditCentroId,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "dispositivos" && (
                <TabDispositivos
                  {...{
                    dispositivosEmpresa,
                    setDispositivosEmpresa,
                    empresaSeleccionada,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "tipoeventos" && (
                <TabTipoEventos
                  {...{
                    tiposEventosEmpresa,
                    setTiposEventosEmpresa,
                    empresaSeleccionada,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}

              {tabActiva === "roles" && (
                <TabRoles
                  {...{
                    rolesEmpresa,
                    setRolesEmpresa,
                    empresaSeleccionada,
                    guardando,
                    setGuardando,
                    styles,
                  }}
                />
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorAlerta: { padding: 16 },
  titleAlerta: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 8,
  },
  textAlerta: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 10,
  },
  tarjetaInteractiva: { marginBottom: 10, borderRadius: 8 },
  tarjetaSeleccionada: { borderWidth: 1.5, borderColor: "#2563EB" },
  headerEmpresa: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  nombreComercial: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  badgeCif: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cifTexto: { fontSize: 12, fontWeight: "bold", color: "#475569" },
  contenedorTabs: { marginTop: 15, flexDirection: "row" },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  tabButtonActivo: { backgroundColor: "#2563EB" },
  tabTexto: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabTextoActivo: { color: "#FFFFFF" },
  formularioTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  campoFormulario: { marginBottom: 14 },
  labelInput: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  inputForm: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  botonGuardar: {
    backgroundColor: "#2563EB",
    height: 46,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  textoBotonGuardar: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  botonAccionHeader: {
    height: 40,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  contenedorFormDesplegado: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  subseccionTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    marginTop: 6,
  },
  itemListaEstructural: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  nombreElementoLista: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  subtextoElementoLista: { fontSize: 12, color: "#64748B", marginTop: 2 },
  textoVacio: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 15,
  },
  contenedorFiltroAnual: { flexDirection: "row", marginBottom: 15 },
  chipAno: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    marginRight: 8,
  },
  chipAnoSeleccionado: { backgroundColor: "#334155" },
  chipAnoTexto: { fontSize: 12, fontWeight: "600", color: "#475569" },
  chipAnoTextoSeleccionado: { color: "#FFFFFF" },
  cuadranteTitulo: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  ayudaTexto: { fontSize: 12, color: "#64748B", marginBottom: 14 },
  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  contenidoModal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.25)",
    elevation: 5,
  },
  modalTitulo: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  modalSubtitulo: { fontSize: 13, color: "#64748B", marginTop: 4 },
  botonModal: {
    flex: 1,
    height: 42,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  botonModalCancelar: { backgroundColor: "#94A3B8", marginRight: 10 },
  botonModalGuardar: { backgroundColor: "#2563EB" },
  textoBotonModal: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  bannerError: {
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  textoBannerError: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
