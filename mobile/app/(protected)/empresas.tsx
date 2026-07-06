import { CalendarioFestivo } from "@/src/modules/calendarios-laborales/types/calendario";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { obtenerEmpresas } from "@/src/modules/empresas/api/services";
import { Festivo } from "@/src/modules/festivos/types/festivo";
import { ItemTurno } from "@/src/modules/turnos/types/turno";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Empresa } from "../../src/modules/empresas/types/empresa";
import {
  crearCentroTrabajo,
  crearTurnoLaboral,
  guardarDatosEmpresa,
  obtenerCalendarioYFestivos,
  obtenerCentrosPorEmpresa,
  obtenerTurnosEmpresa,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { CalendarLaboralAnual } from "../../src/shared/components/calendar";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

type TabConfig = "fiscal" | "centros" | "turnos" | "calendario";

export default function EmpresasScreen() {
  const { usuarioActual, empresaSeleccionada, setEmpresaSeleccionada } =
    useSesion();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados locales para almacenar listas estructuradas asíncronas
  const [centrosConfigurados, setCentrosConfigurados] = useState<
    CentroTrabajo[]
  >([]);
  const [turnosEstructurales, setTurnosEstructurales] = useState<ItemTurno[]>(
    [],
  );
  const [calendarioFestivos, setCalendarioFestivos] = useState<
    CalendarioFestivo[]
  >([]);

  // Pestaña activa de configuración
  const [tabActiva, setTabActiva] = useState<TabConfig>("fiscal");

  // CONTROL DE VISIBILIDAD DE FORMULARIOS
  const [mostrarFormCentro, setMostrarFormCentro] = useState(false);
  const [mostrarFormTurno, setMostrarFormTurno] = useState(false);

  // 1. ESTADOS: Datos Fiscales y Organización
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [convenioInput, setConvenioInput] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [direccionInput, setDireccionInput] = useState("");

  // 2. ESTADOS: Centros de Trabajo
  const [nombreCentro, setNombreCentro] = useState("");
  const [direccionCentro, setDireccionCentro] = useState("");
  const [zonaHoraria, setZonaHoraria] = useState("Europe/Madrid");
  const [codigoCcc, setCodigoCcc] = useState("");

  // 3. ESTADOS: Configuración de Turnos Maestros
  const [nombreTurno, setNombreTurno] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [duracionPausa, setDuracionPausa] = useState("0");

  // --- ESTADOS PARA CALENDARIO ---
  const [anoNuevoCalendario, setAnoNuevoCalendario] = useState("");
  const [calendarioSeleccionado, setCalendarioSeleccionado] =
    useState<CalendarioFestivo | null>(null);

  // Estado para el "Menú Contextual" (Modal)
  const [modalVisible, setModalVisible] = useState(false);
  const [diaSeleccionadoCtx, setDiaSeleccionadoCtx] = useState<string | null>(
    null,
  ); // Guardará "AAAA-MM-DD"
  const [nuevaDescFestivo, setNuevaDescFestivo] = useState("");
  const [tipoFestivo, setNuevoTipoFestivo] = useState("");

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

      cargarDatosEstructurales(empresaSeleccionada.id);
    }
  }, [empresaSeleccionada]);

  const cargarDatosEstructurales = async (empresaId: string) => {
    try {
      const [centros, turnos, dataCalendarios] = await Promise.all([
        obtenerCentrosPorEmpresa(empresaId),
        obtenerTurnosEmpresa(empresaId),
        obtenerCalendarioYFestivos(empresaId),
      ]);
      setCentrosConfigurados(centros || []);
      setTurnosEstructurales(turnos || []);
      setCalendarioFestivos(dataCalendarios || []);

      if (dataCalendarios && dataCalendarios.length > 0) {
        setCalendarioSeleccionado(dataCalendarios[0]);
      }
    } catch {
      console.warn("Error cargando centros o turnos.");
    }
  };

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

  const handleGuardarDatosEmpresa = async () => {
    if (!empresaSeleccionada) return;
    try {
      setGuardando(true);
      guardarDatosEmpresa(
        empresaSeleccionada.id,
        razonSocialInput.trim(),
        convenioInput.trim(),
        cnaeInput.trim(),
        direccionInput.trim(),
      );
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

  const handleCrearCentroTrabajo = async () => {
    if (!nombreCentro || !zonaHoraria || !empresaSeleccionada) {
      Alert.alert(
        "Campos incompletos",
        "Por favor introduce el nombre y la zona horaria del centro.",
      );
      return;
    }
    try {
      setGuardando(true);
      await crearCentroTrabajo({
        empresa_id: empresaSeleccionada.id,
        nombre: nombreCentro.trim(),
        zona_horaria: zonaHoraria.trim(),
        direccion: direccionCentro.trim() || null,
        codigo_ccc: codigoCcc.trim() || null,
      });

      Alert.alert(
        "Alta Exitosa",
        `Centro "${nombreCentro}" configurado en el Tenant.`,
      );
      setNombreCentro("");
      setDireccionCentro("");
      setCodigoCcc("");
      setMostrarFormCentro(false);
      await cargarDatosEstructurales(empresaSeleccionada.id);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "No se pudo registrar el centro de trabajo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearTurnoMaestro = async () => {
    if (!nombreTurno || !horaInicio || !horaFin || !empresaSeleccionada) {
      Alert.alert(
        "Campos de Turno Vacíos",
        "Especifica nombre, hora de inicio y fin (HH:MM:SS).",
      );
      return;
    }
    try {
      setGuardando(true);
      await crearTurnoLaboral({
        empresa_id: empresaSeleccionada.id,
        nombre: nombreTurno.trim(),
        hora_inicio: horaInicio.trim(),
        hora_fin: horaFin.trim(),
        duracion_pausa_minutos: parseInt(duracionPausa, 10) || 0,
        dias_semana: [1, 2, 3, 4, 5],
      });

      Alert.alert(
        "Turno Guardado",
        `El turno estructural "${nombreTurno}" ha sido guardado.`,
      );
      setNombreTurno("");
      setHoraInicio("");
      setHoraFin("");
      setDuracionPausa("0");
      setMostrarFormTurno(false);
      await cargarDatosEstructurales(empresaSeleccionada.id);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "Error al actualizar el guardado del turno maestro.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearCalendarioAnual = async () => {
    const ano = parseInt(anoNuevoCalendario, 10);
    if (!ano || isNaN(ano) || !empresaSeleccionada) {
      Alert.alert("Error", "Introduce un año válido (Ej: 2026)");
      return;
    }
    try {
      setGuardando(true);

      // NOTA: Aquí deberías hacer un await api.crearCalendario(empresaSeleccionada.id, ano)
      const nuevoCal: CalendarioFestivo = {
        id: Math.random().toString(), // Reemplazar por ID real del backend en producción
        anio: ano,
        festivos: [], // Inicialmente vacío si es nuevo, pero conservará los que añadas
      };

      const actualizados = [...calendarioFestivos, nuevoCal];
      setCalendarioFestivos(actualizados);
      setCalendarioSeleccionado(nuevoCal);
      setAnoNuevoCalendario("");
      Alert.alert("Éxito", `Calendario para el año ${ano} creado.`);
    } catch {
      Alert.alert("Error", "No se pudo crear el calendario.");
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarFestivoContextual = async () => {
    if (
      !diaSeleccionadoCtx ||
      !nuevaDescFestivo.trim() ||
      !empresaSeleccionada ||
      !calendarioSeleccionado
    )
      return;

    try {
      setGuardando(true);

      // Formateamos el tipo de festivo de manera limpia (por defecto 'local' si está vacío)
      const tipoValido: "nacional" | "autonomico" | "local" =
        tipoFestivo.trim().toLowerCase() === "nacional" ||
        tipoFestivo.trim().toLowerCase() === "autonómico" ||
        tipoFestivo.trim().toLowerCase() === "autonomico"
          ? "autonomico"
          : tipoFestivo.trim().toLowerCase() === "nacional"
            ? "nacional"
            : "local";

      // --- AQUÍ DEBERÍAS HACER LA LLAMADA A TU BACKEND ---
      // await guardarFestivoEnBD({
      //   calendario_id: calendarioSeleccionado.id,
      //   fecha: diaSeleccionadoCtx,
      //   descripcion: nuevaDescFestivo,
      //   tipo: tipoValido
      // });

      // Actualizamos el estado local (Sincronizado con la Estructura Global)
      const calendariosActualizados = calendarioFestivos.map((cal) => {
        if (cal.id === calendarioSeleccionado.id) {
          // Comprobar si ya existía para actualizarlo o añadirlo
          const existeFestivo = cal.festivos.some(
            (f) => f.fecha === diaSeleccionadoCtx,
          );

          const nuevosFestivos = existeFestivo
            ? cal.festivos.map((f) =>
                f.fecha === diaSeleccionadoCtx
                  ? {
                      ...f,
                      descripcion: nuevaDescFestivo.trim(),
                      tipo: tipoValido,
                    }
                  : f,
              )
            : [
                ...cal.festivos,
                {
                  id: Math.random().toString(), // Reemplazar por ID devuelto por el Backend
                  fecha: diaSeleccionadoCtx,
                  descripcion: nuevaDescFestivo.trim(),
                  tipo: tipoValido,
                },
              ];

          const objetoActualizado = { ...cal, festivos: nuevosFestivos };

          // Sincronizamos inmediatamente el objeto visualizador activo
          setCalendarioSeleccionado(objetoActualizado);
          return objetoActualizado;
        }
        return cal;
      });

      setCalendarioFestivos(calendariosActualizados);

      Alert.alert("Éxito", `Festivo registrado el ${diaSeleccionadoCtx}`);
      setModalVisible(false);
      setNuevaDescFestivo("");
      setNuevoTipoFestivo("");
      setDiaSeleccionadoCtx(null);
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo sincronizar el festivo en la base de datos.",
      );
    } finally {
      setGuardando(false);
    }
  };

  // Manejador disparado desde el componente modular de calendario
  const handleDayPress = (fechaStr: string, festivoExistente?: Festivo) => {
    setDiaSeleccionadoCtx(fechaStr);
    setNuevaDescFestivo(festivoExistente?.descripcion || "");
    setNuevoTipoFestivo(festivoExistente?.tipo || "");
    setModalVisible(true);
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
            </ScrollView>
          </View>
        )}

        {empresaSeleccionada && (
          <View style={{ marginTop: 14 }}>
            <Card>
              {/* TAB 1: DATOS FISCALES */}
              {tabActiva === "fiscal" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Información Fiscal
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
                      onChangeText={(text) => setDireccionInput(text)}
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
                  <Pressable
                    style={[
                      styles.botonAccionHeader,
                      {
                        backgroundColor: mostrarFormCentro
                          ? "#64748B"
                          : "#EA580C",
                      },
                    ]}
                    onPress={() => setMostrarFormCentro(!mostrarFormCentro)}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      {mostrarFormCentro
                        ? "✕ Cancelar"
                        : "＋ Añadir Centro de Trabajo"}
                    </ThemedText>
                  </Pressable>

                  {mostrarFormCentro && (
                    <View style={styles.contenedorFormDesplegado}>
                      <ThemedText style={styles.formularioTitulo}>
                        Dar de Alta Centro de Trabajo
                      </ThemedText>
                      <View style={styles.campoFormulario}>
                        <ThemedText style={styles.labelInput}>
                          Nombre del Centro *
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
                      <Row>
                        <View
                          style={[
                            styles.campoFormulario,
                            { flex: 1, marginRight: 8 },
                          ]}
                        >
                          <ThemedText style={styles.labelInput}>
                            Zona Horaria *
                          </ThemedText>
                          <TextInput
                            style={styles.inputForm}
                            value={zonaHoraria}
                            onChangeText={setZonaHoraria}
                            placeholder="Europe/Madrid"
                          />
                        </View>
                        <View style={[styles.campoFormulario, { flex: 1 }]}>
                          <ThemedText style={styles.labelInput}>
                            Código CCC
                          </ThemedText>
                          <TextInput
                            style={styles.inputForm}
                            value={codigoCcc}
                            onChangeText={setCodigoCcc}
                            keyboardType="numeric"
                            placeholder="28123456789"
                          />
                        </View>
                      </Row>
                      <Pressable
                        style={[
                          styles.botonGuardar,
                          { backgroundColor: "#EA580C" },
                        ]}
                        onPress={handleCrearCentroTrabajo}
                        disabled={guardando}
                      >
                        <ThemedText style={styles.textoBotonGuardar}>
                          Guardar Centro
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  <ThemedText style={styles.subseccionTitulo}>
                    Centros Registrados
                  </ThemedText>

                  {centrosConfigurados.length > 0 ? (
                    centrosConfigurados.map((centro: any) => (
                      <View key={centro.id} style={styles.itemListaEstructural}>
                        <ThemedText style={styles.nombreElementoLista}>
                          {centro.nombre}
                        </ThemedText>
                        <ThemedText style={styles.subtextoElementoLista}>
                          {centro.direccion || "Sin dirección"} •{" "}
                          {centro.zona_horaria}
                        </ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.textoVacio}>
                      No hay centros de trabajo registrados.
                    </ThemedText>
                  )}
                </View>
              )}

              {/* TAB 3: TURNOS MAESTROS */}
              {tabActiva === "turnos" && (
                <View>
                  <Pressable
                    style={[
                      styles.botonAccionHeader,
                      {
                        backgroundColor: mostrarFormTurno
                          ? "#64748B"
                          : "#16A34A",
                      },
                    ]}
                    onPress={() => setMostrarFormTurno(!mostrarFormTurno)}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      {mostrarFormTurno
                        ? "✕ Cancelar"
                        : "＋ Crear Turno Estructural"}
                    </ThemedText>
                  </Pressable>

                  {mostrarFormTurno && (
                    <View style={styles.contenedorFormDesplegado}>
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
                            Hora Inicio (HH:MM:SS)
                          </ThemedText>
                          <TextInput
                            style={styles.inputForm}
                            value={horaInicio}
                            onChangeText={setHoraInicio}
                            placeholder="06:00:00"
                          />
                        </View>
                        <View style={[styles.campoFormulario, { flex: 1 }]}>
                          <ThemedText style={styles.labelInput}>
                            Hora Fin (HH:MM:SS)
                          </ThemedText>
                          <TextInput
                            style={styles.inputForm}
                            value={horaFin}
                            onChangeText={setHoraFin}
                            placeholder="14:00:00"
                          />
                        </View>
                      </Row>
                      <View style={styles.campoFormulario}>
                        <ThemedText style={styles.labelInput}>
                          Duración Pausa (Minutos)
                        </ThemedText>
                        <TextInput
                          style={styles.inputForm}
                          value={duracionPausa}
                          onChangeText={setDuracionPausa}
                          keyboardType="numeric"
                          placeholder="30"
                        />
                      </View>
                      <Pressable
                        style={[
                          styles.botonGuardar,
                          { backgroundColor: "#16A34A" },
                        ]}
                        onPress={handleCrearTurnoMaestro}
                        disabled={guardando}
                      >
                        <ThemedText style={styles.textoBotonGuardar}>
                          Guardar Turno estructural
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  <ThemedText style={styles.subseccionTitulo}>
                    Turnos Estructurales
                  </ThemedText>

                  {turnosEstructurales.length > 0 ? (
                    turnosEstructurales.map((turno: any) => (
                      <View key={turno.id} style={styles.itemListaEstructural}>
                        <ThemedText style={styles.nombreElementoLista}>
                          {turno.nombre}
                        </ThemedText>
                        <ThemedText style={styles.subtextoElementoLista}>
                          Horario: {turno.hora_inicio} a {turno.hora_fin} (
                          {turno.duracion_pausa_minutos} min pausa)
                        </ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.textoVacio}>
                      No hay turnos maestros registrados.
                    </ThemedText>
                  )}
                </View>
              )}

              {/* TAB 4: CALENDARIO LABORAL DELEGADO AL COMPONENTE EXTERNO */}
              {tabActiva === "calendario" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Gestión de Calendarios Anuales
                  </ThemedText>

                  {/* SECCIÓN CREAR NUEVO AÑO */}
                  <View style={styles.contenedorFormDesplegado}>
                    <ThemedText style={styles.labelInput}>
                      Crear calendario para el año:
                    </ThemedText>
                    <View style={{ alignItems: "center", marginBottom: 0 }}>
                      <Row>
                        <TextInput
                          style={[
                            styles.inputForm,
                            { flex: 1, marginRight: 10 },
                          ]}
                          placeholder="Ej. 2026"
                          keyboardType="numeric"
                          value={anoNuevoCalendario}
                          onChangeText={setAnoNuevoCalendario}
                        />
                        <Pressable
                          style={[
                            styles.botonGuardar,
                            { marginTop: 0, paddingHorizontal: 20, height: 44 },
                          ]}
                          onPress={handleCrearCalendarioAnual}
                        >
                          <ThemedText style={styles.textoBotonGuardar}>
                            ＋ Inicializar
                          </ThemedText>
                        </Pressable>
                      </Row>
                    </View>
                  </View>

                  <ThemedText style={styles.subseccionTitulo}>
                    Calendarios Disponibles
                  </ThemedText>

                  {/* LISTADO/SELECTOR DE CALENDARIOS GENERADOS */}
                  {calendarioFestivos.length > 0 ? (
                    <View style={styles.contenedorFiltroAnual}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {calendarioFestivos.map((cal) => {
                          const anioString = cal.anio
                            ? cal.anio.toString()
                            : "N/A";
                          const estaSeleccionado =
                            calendarioSeleccionado?.id === cal.id;

                          return (
                            <Pressable
                              key={cal.id || anioString}
                              style={[
                                styles.chipAno,
                                estaSeleccionado && styles.chipAnoSeleccionado,
                              ]}
                              onPress={() => setCalendarioSeleccionado(cal)}
                            >
                              <ThemedText
                                style={[
                                  styles.chipAnoTexto,
                                  estaSeleccionado &&
                                    styles.chipAnoTextoSeleccionado,
                                ]}
                              >
                                Año {anioString}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : (
                    <ThemedText style={styles.textoVacio}>
                      No se han inicializado cuadrantes para esta empresa.
                    </ThemedText>
                  )}

                  {/* LLAMADA AL COMPONENTE MODULAR REUTILIZABLE */}
                  {calendarioSeleccionado && (
                    <View style={{ marginTop: 15 }}>
                      <ThemedText style={styles.cuadranteTitulo}>
                        Cuadrante Anual: {calendarioSeleccionado.anio}
                      </ThemedText>
                      <ThemedText style={styles.ayudaTexto}>
                        Presiona sobre cualquier día para asignarlo como
                        Festivo/No Laborable.
                      </ThemedText>

                      <CalendarLaboralAnual
                        year={calendarioSeleccionado.anio}
                        festivos={calendarioSeleccionado.festivos}
                        onDayPress={handleDayPress}
                      />
                    </View>
                  )}
                </View>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* MODAL CONTEXTUAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenidoModal}>
            <ThemedText style={styles.modalTitulo}>
              Configurar Día Festivo
            </ThemedText>
            <ThemedText style={styles.modalSubtitulo}>
              Fecha seleccionada: {diaSeleccionadoCtx}
            </ThemedText>

            <TextInput
              style={[styles.inputForm, { marginTop: 15, marginBottom: 20 }]}
              placeholder="Descripción del festivo (Ej: Año Nuevo)"
              value={nuevaDescFestivo}
              onChangeText={setNuevaDescFestivo}
            />

            <TextInput
              style={[styles.inputForm, { marginTop: 15, marginBottom: 20 }]}
              placeholder="Tipo de festivo (Ej: Autonómico, Nacional, Local)"
              value={tipoFestivo}
              onChangeText={setNuevoTipoFestivo}
            />

            <Row>
              <Pressable
                style={[styles.botonModal, styles.botonModalCancelar]}
                onPress={() => {
                  setModalVisible(false);
                  setDiaSeleccionadoCtx(null);
                  setNuevaDescFestivo("");
                  setNuevoTipoFestivo("");
                }}
              >
                <ThemedText style={styles.textoBotonModal}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.botonModal, styles.botonModalGuardar]}
                onPress={handleGuardarFestivoContextual}
                disabled={guardando}
              >
                <ThemedText style={styles.textoBotonModal}>Guardar</ThemedText>
              </Pressable>
            </Row>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorAlerta: {
    padding: 16,
  },
  titleAlerta: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 8,
  },
  textAlerta: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 10,
  },
  tarjetaInteractiva: {
    marginBottom: 10,
    borderRadius: 8,
  },
  tarjetaSeleccionada: {
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  headerEmpresa: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  nombreComercial: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  badgeCif: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cifTexto: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#475569",
  },
  contenedorTabs: {
    marginTop: 15,
    flexDirection: "row",
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  tabButtonActivo: {
    backgroundColor: "#2563EB",
  },
  tabTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextoActivo: {
    color: "#FFFFFF",
  },
  formularioTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  campoFormulario: {
    marginBottom: 14,
  },
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
  textoBotonGuardar: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
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
  nombreElementoLista: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  subtextoElementoLista: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  textoVacio: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 15,
  },
  contenedorFiltroAnual: {
    flexDirection: "row",
    marginBottom: 15,
  },
  chipAno: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    marginRight: 8,
  },
  chipAnoSeleccionado: {
    backgroundColor: "#334155",
  },
  chipAnoTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipAnoTextoSeleccionado: {
    color: "#FFFFFF",
  },
  cuadranteTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  ayudaTexto: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  botonModal: {
    flex: 1,
    height: 42,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  botonModalCancelar: {
    backgroundColor: "#94A3B8",
    marginRight: 10,
  },
  botonModalGuardar: {
    backgroundColor: "#2563EB",
  },
  textoBotonModal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
