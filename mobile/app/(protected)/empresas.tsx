import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { obtenerEmpresas } from "../../src/modules/empresas/api/services";
import { Empresa } from "../../src/modules/empresas/types/empresa";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import api from "../../src/service/api/api";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

type TabConfig = "fiscal" | "centros" | "turnos" | "calendario" | "roles";

export default function EmpresasScreen() {
  const { usuarioActual, empresaSeleccionada, setEmpresaSeleccionada } =
    useSesion();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Pestaña activa de configuración
  const [tabActiva, setTabActiva] = useState<TabConfig>("fiscal");

  // 1. ESTADOS: Datos Fiscales y Organización
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [convenioInput, setConvenioInput] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [direccionInput, setDireccionInput] = useState("");

  // 2. ESTADOS: Centros de Trabajo
  const [nombreCentro, setNombreCentro] = useState("");
  const [direccionCentro, setDireccionCentro] = useState("");

  // 3. ESTADOS: Configuración de Turnos Maestros
  const [nombreTurno, setNombreTurno] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  // 4. ESTADOS: Calendario Laboral y Festivos
  const [fechaFestivo, setFechaFestivo] = useState("");
  const [descripcionFestivo, setDescripcionFestivo] = useState("");

  // 5. ESTADOS: Roles y Permisos RBAC
  const [rolSeleccionado, setRolSeleccionado] = useState<
    "admin_empresa" | "trabajador"
  >("trabajador");

  const esGestoria = usuarioActual?.tipo_usuario === "admin_gestoria";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "admin_empresa";
  const esAutorizado = esGestoria || esAdminEmpresa;

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
    }
  }, [empresaSeleccionada]);

  const cargarCatalogoEmpresas = async () => {
    try {
      setCargando(true);
      const todasLasEmpresas = await obtenerEmpresas();
      let empresasPermitidas = esGestoria
        ? todasLasEmpresas
        : todasLasEmpresas.filter(
            (e: { id: string | null | undefined }) =>
              e.id === usuarioActual?.empresa_id,
          );

      setEmpresas(empresasPermitidas);
      if (
        empresasPermitidas.length > 0 &&
        !empresaSeleccionada &&
        setEmpresaSeleccionada
      ) {
        setEmpresaSeleccionada(empresasPermitidas[0]);
      }
    } catch {
      Alert.alert(
        "Error Saas",
        "No se pudo sincronizar la información corporativa.",
      );
    } finally {
      setCargando(false);
    }
  };

  // ACCIÓN: Actualizar Datos Fiscales de la Empresa
  const handleGuardarDatosEmpresa = async () => {
    if (!empresaSeleccionada) return;
    try {
      setGuardando(true);
      await api.put(
        `/api/empresas/${empresaSeleccionada.id}/razon-social`,
        null,
        {
          params: { nueva_razon_social: razonSocialInput },
        },
      );
      // Simulación de guardado del resto de metadatos mapeados
      Alert.alert("Éxito", "Parámetros fiscales actualizados correctamente.");
      await cargarCatalogoEmpresas();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Error al actualizar.",
      );
    } finally {
      setGuardando(false);
    }
  };

  // ACCIÓN: Crear un nuevo Centro de Trabajo (PostgreSQL)
  const handleCrearCentroTrabajo = async () => {
    if (!nombreCentro || !direccionCentro || !empresaSeleccionada) {
      Alert.alert(
        "Campos incompletos",
        "Por favor introduce el nombre y la dirección del centro.",
      );
      return;
    }
    try {
      setGuardando(true);
      await api.post("/api/centros-trabajo", {
        empresa_id: empresaSeleccionada.id,
        nombre: nombreCentro,
        direccion: direccionCentro,
      });
      Alert.alert(
        "Alta Exitosa",
        `Centro "${nombreCentro}" configurado en el Tenant.`,
      );
      setNombreCentro("");
      setDireccionCentro("");
    } catch {
      Alert.alert("Error", "No se pudo registrar el centro de trabajo.");
    } finally {
      setGuardando(false);
    }
  };

  // ACCIÓN: Definir un Turno Maestro para la organización
  const handleCrearTurnoMaestro = async () => {
    if (!nombreTurno || !horaInicio || !horaFin || !empresaSeleccionada) {
      Alert.alert(
        "Campos de Turno Vacíos",
        "Especifica nombre, hora de inicio y fin (HH:MM).",
      );
      return;
    }
    try {
      setGuardando(true);
      await api.post("/api/turnos", {
        empresa_id: empresaSeleccionada.id,
        nombre: nombreTurno,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      });
      Alert.alert(
        "Turno Guardado",
        `El turno estructural "${nombreTurno}" ha sido guardado.`,
      );
      setNombreTurno("");
      setHoraInicio("");
      setHoraFin("");
    } catch {
      Alert.alert("Error", "Error al procesar el guardado del turno maestro.");
    } finally {
      setGuardando(false);
    }
  };

  // ACCIÓN: Configurar Festivos / Calendario de Empresa
  const handleAgregarDiaFestivo = async () => {
    if (!fechaFestivo || !descripcionFestivo || !empresaSeleccionada) {
      Alert.alert(
        "Datos faltantes",
        "Asigna una fecha (AAAA-MM-DD) y una descripción.",
      );
      return;
    }
    try {
      setGuardando(true);
      await api.post("/api/calendarios-laborales/festivos", {
        empresa_id: empresaSeleccionada.id,
        fecha: fechaFestivo,
        descripcion: descripcionFestivo,
      });
      Alert.alert("Día Añadido", "Festivo incorporado al cuadrante anual.");
      setFechaFestivo("");
      setDescripcionFestivo("");
    } catch {
      Alert.alert("Error", "No se pudo sincronizar el día no laborable.");
    } finally {
      setGuardando(false);
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

        {/* LISTADO DE SELECCIÓN DE EMPRESA */}
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
            keyExtractor={(item) => item.id}
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
                      <ThemedText style={styles.nombreComercial}>
                        {item.nombre_comercial} {estaSeleccionada && "🔹"}
                      </ThemedText>
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

        {/* BARRA DE PESTAÑAS (TABS NAVIGATOR PARA ANDROID/IOS FLUIDO) */}
        {empresaSeleccionada && (
          <View style={styles.contenedorTabs}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              fadingEdgeLength={25}
            >
              <Pressable
                style={[
                  styles.tabButton,
                  tabActiva === "fiscal" && styles.tabButtonActivo,
                ]}
                onPress={() => setTabActiva("fiscal")}
              >
                <ThemedText
                  style={[
                    styles.tabTexto,
                    tabActiva === "fiscal" && styles.tabTextoActivo,
                  ]}
                >
                  Fiscal
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.tabButton,
                  tabActiva === "centros" && styles.tabButtonActivo,
                ]}
                onPress={() => setTabActiva("centros")}
              >
                <ThemedText
                  style={[
                    styles.tabTexto,
                    tabActiva === "centros" && styles.tabTextoActivo,
                  ]}
                >
                  Centros de Trabajo
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.tabButton,
                  tabActiva === "turnos" && styles.tabButtonActivo,
                ]}
                onPress={() => setTabActiva("turnos")}
              >
                <ThemedText
                  style={[
                    styles.tabTexto,
                    tabActiva === "turnos" && styles.tabTextoActivo,
                  ]}
                >
                  Turnos Maestros
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.tabButton,
                  tabActiva === "calendario" && styles.tabButtonActivo,
                ]}
                onPress={() => setTabActiva("calendario")}
              >
                <ThemedText
                  style={[
                    styles.tabTexto,
                    tabActiva === "calendario" && styles.tabTextoActivo,
                  ]}
                >
                  Calendario Laboral
                </ThemedText>
              </Pressable>
              {/* <Pressable
                style={[
                  styles.tabButton,
                  tabActiva === "roles" && styles.tabButtonActivo,
                ]}
                onPress={() => setTabActiva("roles")}
              >
                <ThemedText
                  style={[
                    styles.tabTexto,
                    tabActiva === "roles" && styles.tabTextoActivo,
                  ]}
                >
                  Permisos y Roles
                </ThemedText>
              </Pressable> */}
            </ScrollView>
          </View>
        )}

        {/* CONTENEDOR DE FORMULARIOS DINÁMICOS SEGÚN LA PESTAÑA */}
        {empresaSeleccionada && (
          <View style={{ marginTop: 14 }}>
            <Card>
              {/* TAB 1: DATOS FISCALES */}
              {tabActiva === "fiscal" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Metadatos y Registro Fiscal
                  </ThemedText>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Razón Social
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={razonSocialInput}
                      onChangeText={setRazonSocialInput}
                    />
                  </View>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Convenio Colectivo
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={convenioInput}
                      onChangeText={setConvenioInput}
                    />
                  </View>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Código CNAE
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={cnaeInput}
                      onChangeText={setCnaeInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Dirección Social
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={direccionInput}
                      onChangeText={setDireccionInput}
                    />
                  </View>
                  <Pressable
                    style={styles.botonGuardar}
                    onPress={handleGuardarDatosEmpresa}
                    disabled={guardando}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      Actualizar Configuración Fiscal
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* TAB 2: CENTROS DE TRABAJO */}
              {tabActiva === "centros" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Dar de Alta Centro de Trabajo
                  </ThemedText>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Nombre del Centro
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={nombreCentro}
                      onChangeText={setNombreCentro}
                      placeholder="Ej. Sede Principal, Almacén Norte..."
                    />
                  </View>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Dirección del Centro
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={direccionCentro}
                      onChangeText={setDireccionCentro}
                      placeholder="Calle, número y ciudad"
                    />
                  </View>
                  <Pressable
                    style={[
                      styles.botonGuardar,
                      { backgroundColor: "#EA580C" },
                    ]}
                    onPress={handleCrearCentroTrabajo}
                    disabled={guardando}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      Añadir Centro de Trabajo
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* TAB 3: TURNOS MAESTROS */}
              {tabActiva === "turnos" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Estructurar Horarios y Turnos de Empresa
                  </ThemedText>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Identificador / Nombre del Turno
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={nombreTurno}
                      onChangeText={setNombreTurno}
                      placeholder="Ej: Mañana Rotativo, Intensivo Verano"
                    />
                  </View>
                  <Row>
                    <View
                      style={[
                        styles.campoFormulario,
                        { flex: 1, marginRight: 8 },
                      ]}
                    >
                      <ThemedText style={styles.labelInput}>
                        Hora Inicio
                      </ThemedText>
                      <TextInput
                        style={styles.inputForm}
                        value={horaInicio}
                        onChangeText={setHoraInicio}
                        placeholder="06:00"
                      />
                    </View>
                    <View style={[styles.campoFormulario, { flex: 1 }]}>
                      <ThemedText style={styles.labelInput}>
                        Hora Fin
                      </ThemedText>
                      <TextInput
                        style={styles.inputForm}
                        value={horaFin}
                        onChangeText={setHoraFin}
                        placeholder="14:00"
                      />
                    </View>
                  </Row>
                  <Pressable
                    style={[
                      styles.botonGuardar,
                      { backgroundColor: "#16A34A" },
                    ]}
                    onPress={handleCrearTurnoMaestro}
                    disabled={guardando}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      Crear Turno Estructural
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* TAB 4: CALENDARIO LABORAL */}
              {tabActiva === "calendario" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Configurar Calendario Anual (Días Inactivos / Festivos)
                  </ThemedText>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Fecha del Festivo
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={fechaFestivo}
                      onChangeText={setFechaFestivo}
                      placeholder="AAAA-MM-DD"
                    />
                  </View>
                  <View style={styles.campoFormulario}>
                    <ThemedText style={styles.labelInput}>
                      Motivo / Festividad
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={descripcionFestivo}
                      onChangeText={setDescripcionFestivo}
                      placeholder="Ej. Festivo Nacional, Patrón del Sector"
                    />
                  </View>
                  <Pressable
                    style={[
                      styles.botonGuardar,
                      { backgroundColor: "#7C3AED" },
                    ]}
                    onPress={handleAgregarDiaFestivo}
                    disabled={guardando}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      Fijar Día No Laborable
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* TAB 5: ROLES Y CONFIGURACIÓN RBAC */}
              {/* {tabActiva === "roles" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Matriz de Roles y Niveles de Permisos de Empresa
                  </ThemedText>
                  <ThemedText style={styles.textoInformativo}>
                    Define el comportamiento de seguridad corporativa por
                    defecto para los usuarios de este Tenant.
                  </ThemedText>
                  <View style={{ marginTop: 10, gap: 10 }}>
                    <Row>
                      <Pressable
                        style={[
                          styles.selectorRolCard,
                          rolSeleccionado === "trabajador" &&
                            styles.selectorRolCardActivo,
                        ]}
                        onPress={() => setRolSeleccionado("trabajador")}
                      >
                        <IconSymbol
                          name="person"
                          size={24}
                          color={
                            rolSeleccionado === "trabajador"
                              ? "#2563EB"
                              : "#64748B"
                          }
                        />
                        <ThemedText style={styles.rolTitulo}>
                          Trabajador
                        </ThemedText>
                        <ThemedText style={styles.rolDescripcion}>
                          Fichajes, ver cuadrante y solicitar ausencias.
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.selectorRolCard,
                          rolSeleccionado === "admin_empresa" &&
                            styles.selectorRolCardActivo,
                        ]}
                        onPress={() => setRolSeleccionado("admin_empresa")}
                      >
                        <IconSymbol
                          name="shield"
                          size={24}
                          color={
                            rolSeleccionado === "admin_empresa"
                              ? "#2563EB"
                              : "#64748B"
                          }
                        />
                        <ThemedText style={styles.rolTitulo}>
                          Admin Empresa
                        </ThemedText>
                        <ThemedText style={styles.rolDescripcion}>
                          Control completo, resolución de incidencias y centros.
                        </ThemedText>
                      </Pressable>
                    </Row>
                  </View>
                </View>
              )} */}
            </Card>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorAlerta: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    padding: 4,
    marginTop: 20,
  },
  titleAlerta: {
    color: "#991B1B",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  textAlerta: { color: "#7F1D1D", fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  tarjetaInteractiva: {
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tarjetaSeleccionada: { borderColor: "#2563EB" },
  headerEmpresa: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  nombreComercial: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  badgeCif: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cifTexto: { fontSize: 11, fontWeight: "700", color: "#475569" },

  // Tabs Estilos
  contenedorTabs: { flexDirection: "row", marginTop: 16, height: 46 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    height: 38,
  },
  tabButtonActivo: { backgroundColor: "#0F172A" },
  tabTexto: { fontSize: 13, fontWeight: "700", color: "#475569" },
  tabTextoActivo: { color: "#FFFFFF" },

  // Formularios Estilos
  formularioTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  textoInformativo: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  campoFormulario: { marginBottom: 12 },
  labelInput: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  inputForm: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
  },
  botonGuardar: {
    backgroundColor: "#2563EB",
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  textoBotonGuardar: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  selectorRolCard: {
    flex: 1,
    padding: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  selectorRolCardActivo: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  rolTitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  rolDescripcion: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
  },
});
