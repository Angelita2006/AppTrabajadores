import { obtenerCalendariosFestivosPorEmpresa } from "@/src/modules/calendarios-laborales/api/services";
import { CalendarioFestivo } from "@/src/modules/calendarios-laborales/types/calendario";
import { obtenerCentrosTrabajoPorEmpresa } from "@/src/modules/centros-trabajo/api/services";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { obtenerDepartamentosEmpresa } from "@/src/modules/departamentos/api/services";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import { obtenerDispositivosEmpresa } from "@/src/modules/dispositivos-fichaje/api/services";
import { Dispositivo } from "@/src/modules/dispositivos-fichaje/types/dispositivo-fichaje";
import {
  actualizarLogoEmpresa,
  guardarDatosEmpresa,
  obtenerEmpresas,
} from "@/src/modules/empresas/api/services";
import { ImagenConToken } from "@/src/modules/empresas/components/Archivos";
import TabCalendario from "@/src/modules/empresas/components/tabs/CalendariosTab";
import TabCentros from "@/src/modules/empresas/components/tabs/CentrosTab";
import TabDepartamentos from "@/src/modules/empresas/components/tabs/DepartamentosTab";
import TabDispositivos from "@/src/modules/empresas/components/tabs/DispositivosTab";
import TabFiscal from "@/src/modules/empresas/components/tabs/FiscalTab";
import TabTipoEventos from "@/src/modules/empresas/components/tabs/TiposFichajesTab";
import TabTurnos from "@/src/modules/empresas/components/tabs/TurnosTab";
import { Rol } from "@/src/modules/roles/types/rol";
import { obtenerTiposEventosEmpresa } from "@/src/modules/tipos_eventos_fichaje/api/services";
import { TipoEventoFichaje } from "@/src/modules/tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { obtenerTurnosEmpresa } from "@/src/modules/turnos/api/services";
import { Turno } from "@/src/modules/turnos/types/turno";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Empresa } from "../../src/modules/empresas/types/empresa";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

type TabConfig =
  | "fiscal"
  | "centros"
  | "turnos"
  | "departamentos"
  | "calendario"
  | "dispositivos"
  | "tipoeventos";

export default function EmpresasScreen() {
  const { usuarioActual, empresaActual, setEmpresaActual } = useSesion();
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
  const [calendarioActual, setCalendarioActual] =
    useState<CalendarioFestivo | null>(null);
  const [editAnio, setEditAnio] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editCentroId, setEditCentroId] = useState<string | null>(null);

  // Estados para roles
  const esGestoria = usuarioActual?.tipo_usuario === "Admin_gestoría";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "Admin_empresa";
  const esRRHH = usuarioActual?.tipo_usuario === "Rrhh";
  const esAutorizado = esGestoria || esAdminEmpresa || esRRHH;

  // Estados para la gestión de la entidad y su logo corporativo
  const [logoUrlInput, setLogoUrlInput] = useState("");

  const { mostrarError, mostrarMensaje } = useAppModal();

  // Sincronizar el input del logo cada vez que cambie la empresa seleccionada
  useEffect(() => {
    if (empresaActual) {
      setLogoUrlInput(empresaActual.logo_url || "");
    }
  }, [empresaActual]);

  useEffect(() => {
    if (esAutorizado) {
      cargarCatalogoEmpresas();
    }
  }, [esAutorizado]);

  useEffect(() => {
    if (empresaActual) {
      setRazonSocialInput(empresaActual.razon_social || "");
      setConvenioInput(empresaActual.convenio_colectivo || "");
      setCnaeInput(empresaActual.codigo_cnae || "");
      setDireccionInput(empresaActual.direccion_fiscal || "");

      cargarDatosEmpresa(empresaActual.id);
    }
  }, [empresaActual]);

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
      ] = await Promise.all([
        obtenerCentrosTrabajoPorEmpresa(empresaId),
        obtenerCalendariosFestivosPorEmpresa(empresaId),
        obtenerTurnosEmpresa(empresaId),
        obtenerDepartamentosEmpresa(empresaId),
        obtenerDispositivosEmpresa(empresaId),
        obtenerTiposEventosEmpresa(empresaId),
      ]);

      setCentrosEmpresa(datosCentros);
      setCalendariosEmpresa(datosCalendarios);
      setTurnosEmpresa(datosTurnos);
      setDepartamentosEmpresa(datosDepartamentos);
      setDispositivosEmpresa(datosDispositivos);
      setTiposEventosEmpresa(datosTiposEventos);

      if (datosCalendarios.length > 0) {
        const primerCalendario: CalendarioFestivo = datosCalendarios[0];
        setCalendarioActual(primerCalendario);
        setEditAnio(primerCalendario.anio.toString());
        setEditNombre(primerCalendario.nombre || "");
        setEditCentroId(primerCalendario.centro_trabajo_id || "");
      }
    } catch (error: any) {
      mostrarError(
        "Error al cargar la información operativa y estructural de la empresa: " +
          error.message,
      );
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
      if (empresasPermitidas.length > 0 && !empresaActual && setEmpresaActual) {
        setEmpresaActual(empresasPermitidas[0]);
      }
    } catch (error: any) {
      mostrarError(
        "Error al obtener el catálogo de empresas autorizadas: " +
          error.message,
      );
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarDatosEmpresa = async () => {
    if (!empresaActual) return;
    try {
      setGuardando(true);
      await guardarDatosEmpresa(
        empresaActual.id,
        razonSocialInput.trim(),
        empresaActual.cif,
        empresaActual.zona_horaria,
        empresaActual.activa,
        empresaActual.nombre_comercial,
        convenioInput.trim(),
        cnaeInput.trim(),
        direccionInput.trim(),
      );
      mostrarMensaje(
        "Éxito",
        "Parámetros fiscales actualizados correctamente.",
      );
      await cargarCatalogoEmpresas();
    } catch (error: any) {
      mostrarError(
        "Error al guardar los datos fiscales de la empresa: " + error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarLogo = async (empresa: Empresa) => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      mostrarMensaje(
        "Alerta",
        "Se requieren permisos para acceder a la galería de fotos.",
      );
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
        if (empresaActual) {
          setEmpresaActual(empresaActualizada);
        }

        mostrarMensaje("Éxito", "¡Logo actualizado correctamente!");
      } catch (error: any) {
        mostrarError(
          "Error al actualizar el logotipo corporativo: " + error.message,
        );
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
            value={
              esGestoria
                ? "Gestoría"
                : esAdminEmpresa
                  ? "Administrador"
                  : "RRHH"
            }
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
              const estaSeleccionada = empresaActual?.id === item.id;
              return (
                <Pressable
                  onPress={
                    esGestoria && empresas.length > 1
                      ? () => setEmpresaActual?.(item)
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
                            <ImagenConToken
                              rutaRelativa={item.logo_url}
                              style={{ width: 36, height: 36 }}
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
        {empresaActual && (
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
        {empresaActual && (
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
                    empresaActual,
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
                    empresaActual,
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
                    centrosEmpresa,
                    empresaActual,
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
                    empresaActual,
                    calendarioActual,
                    setCalendarioActual,
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
                    centrosEmpresa,
                    dispositivosEmpresa,
                    setDispositivosEmpresa,
                    empresaActual,
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
                    empresaActual,
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
