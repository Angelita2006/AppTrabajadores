import {
  CalendarioFestivo,
  CalendarioLaboralCreate,
  CalendarioLaboralResponse,
  CalendarioLaboralUpdate,
} from "@/src/modules/calendarios-laborales/types/calendario";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import { obtenerEmpresas } from "@/src/modules/empresas/api/services";
import { Festivo } from "@/src/modules/festivos/types/festivo";
import {
  crearCalendarioLaboral,
  crearDepartamento,
  editarCentroTrabajo,
  editarDepartamento,
  editarTurno,
  eliminarCalendarioLaboral,
  eliminarCentroTrabajo,
  eliminarDepartamento,
  eliminarTurno,
  importarCalendarioPDF,
  modificarCalendarioLaboral,
  obtenerDepartamentosEmpresa,
  obtenerTurnosEmpresa,
} from "@/src/modules/trabajadores/api/services";
import { ItemTurno } from "@/src/modules/turnos/types/turno";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Empresa } from "../../src/modules/empresas/types/empresa";
import {
  crearCentroTrabajo,
  crearFestivo,
  crearTurnoLaboral,
  editarFestivo,
  guardarDatosEmpresa,
  obtenerCalendarioYFestivos,
  obtenerCentrosPorEmpresa,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { CalendarLaboralAnual } from "../../src/shared/components/calendar";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

type TabConfig =
  | "fiscal"
  | "centros"
  | "turnos"
  | "departamentos"
  | "calendario";

export default function EmpresasScreen() {
  const { usuarioActual, empresaSeleccionada, setEmpresaSeleccionada } =
    useSesion();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [centrosConfigurados, setCentrosConfigurados] = useState<
    CentroTrabajo[]
  >([]);
  const [turnosEstructurales, setTurnosEstructurales] = useState<ItemTurno[]>(
    [],
  );
  const [calendarioFestivos, setCalendarioFestivos] = useState<
    CalendarioFestivo[]
  >([]);

  const [tabActiva, setTabActiva] = useState<TabConfig>("fiscal");

  const [mostrarFormCentro, setMostrarFormCentro] = useState(false);
  const [mostrarFormTurno, setMostrarFormTurno] = useState(false);

  // ESTADOS: Datos Fiscales
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [convenioInput, setConvenioInput] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [direccionInput, setDireccionInput] = useState("");

  // ESTADOS: Centros de Trabajo
  const [nombreCentro, setNombreCentro] = useState("");
  const [direccionCentro, setDireccionCentro] = useState("");
  const [zonaHoraria, setZonaHoraria] = useState("Europe/Madrid");
  const [codigoCcc, setCodigoCcc] = useState("");
  const [centroEnEdicion, setCentroEnEdicion] = useState<CentroTrabajo | null>(
    null,
  );

  // ESTADOS: Configuración de Turnos
  const [nombreTurno, setNombreTurno] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [duracionPausa, setDuracionPausa] = useState("0");
  const [turnoEnEdicion, setTurnoEnEdicion] = useState<ItemTurno | null>(null);

  // ESTADOS: Departamentos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [mostrarFormDepartamento, setMostrarFormDepartamento] = useState(false);
  const [nombreDepto, setNombreDepto] = useState("");
  const [departamentoEnEdicion, setDepartamentoEnEdicion] =
    useState<Departamento | null>(null);
  const [centroTrabajoId, setCentroTrabajoId] = useState<string | null>(null);

  // ESTADOS PARA CALENDARIO
  const [anoNuevoCalendario, setAnoNuevoCalendario] = useState("");
  const [nombreNuevoCalendario, setNombreNuevoCalendario] = useState("");
  const [centroNuevoCalendario, setCentroNuevoCalendario] =
    useState<string>("");
  const [importandoPdf, setImportandoPdf] = useState(false);

  const [calendarioSeleccionado, setCalendarioSeleccionado] =
    useState<CalendarioFestivo | null>(null);
  const [mostrarEdicionCampos, setMostrarEdicionCampos] = useState(false);

  // Estados para la edición/cambio de parámetros de un calendario existente
  const [editAnio, setEditAnio] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editCentroId, setEditCentroId] = useState<string | null>(null);

  // Estado para el "Menú Contextual" del día (Modal)
  const [modalVisible, setModalVisible] = useState(false);
  const [diaSeleccionadoCtx, setDiaSeleccionadoCtx] = useState<string | null>(
    null,
  );
  const [nuevaDescFestivo, setNuevaDescFestivo] = useState("");
  const [tipoFestivo, setNuevoTipoFestivo] = useState("");

  const esGestoria = usuarioActual?.tipo_usuario === "Admin_gestoría";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "Admin_empresa";
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

      cargarDatosEmpresa(empresaSeleccionada.id);
    }
  }, [empresaSeleccionada]);

  // Sincronizar el primer centro de trabajo de forma predeterminada
  useEffect(() => {
    if (centrosConfigurados && centrosConfigurados.length > 0) {
      setCentroNuevoCalendario(centrosConfigurados[0].id);
    } else {
      setCentroNuevoCalendario("");
    }
  }, [centrosConfigurados]);

  // Al cambiar el calendario activo, precargamos sus valores de edición
  useEffect(() => {
    if (calendarioSeleccionado) {
      setEditAnio(String(calendarioSeleccionado.anio));
      setEditNombre(calendarioSeleccionado.nombre || "");
      setEditCentroId(calendarioSeleccionado.centro_trabajo_id || null);
    }
  }, [calendarioSeleccionado]);

  const cargarDatosEmpresa = async (empresaId: string) => {
    try {
      setCargando(true);
      const [datosCentros, datosCalendarios, datosTurnos, datosDepartamentos] =
        await Promise.all([
          obtenerCentrosPorEmpresa(empresaId),
          obtenerCalendarioYFestivos(empresaId),
          obtenerTurnosEmpresa(empresaId),
          obtenerDepartamentosEmpresa(empresaId),
        ]);
      setCentrosConfigurados(datosCentros);
      setCalendarioFestivos(datosCalendarios);
      setTurnosEstructurales(datosTurnos);
      setDepartamentos(datosDepartamentos);

      if (datosCalendarios.length > 0) {
        const primerCalendario: CalendarioFestivo = datosCalendarios[0];
        setCalendarioSeleccionado(primerCalendario);
        setEditAnio(primerCalendario.anio.toString());
        setEditNombre(primerCalendario.nombre || "");
        setEditCentroId(primerCalendario.centro_trabajo_id || "");
      }
    } catch (error) {
      console.error("Error al cargar datos de empresa:", error);
      Alert.alert(
        "Error",
        "No se pudieron obtener los datos completos de la empresa.",
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
      await cargarDatosEmpresa(empresaSeleccionada.id);
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
      await cargarDatosEmpresa(empresaSeleccionada.id);
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

  const handleCrearDepartamento = async () => {
    if (!nombreDepto.trim() || !empresaSeleccionada?.id) return;

    try {
      const nuevoDepto = await crearDepartamento({
        empresa_id: empresaSeleccionada.id,
        nombre: nombreDepto,
        centro_trabajo_id: centroTrabajoId,
      });

      setDepartamentos([...departamentos, nuevoDepto]);
      setNombreDepto("");
      setCentroTrabajoId(null);
      setMostrarFormDepartamento(false);
    } catch (error) {
      console.error("Error al crear departamento:", error);
    }
  };

  const handleCrearCalendarioAnual = async () => {
    if (!centrosConfigurados || centrosConfigurados.length === 0) {
      Alert.alert(
        "Acción Bloqueada",
        "No se puede crear un calendario si la empresa no tiene centros de trabajo.",
      );
      return;
    }

    const ano = parseInt(anoNuevoCalendario, 10);
    if (
      !ano ||
      isNaN(ano) ||
      ano < 2020 ||
      ano > 2100 ||
      !empresaSeleccionada
    ) {
      Alert.alert("Error", "Introduce un año válido entre 2020 y 2100.");
      return;
    }
    try {
      setGuardando(true);

      const payload: CalendarioLaboralCreate = {
        empresa_id: empresaSeleccionada.id,
        anio: ano,
        nombre: nombreNuevoCalendario.trim() || `Calendario Anual ${ano}`,
        centro_trabajo_id: centroNuevoCalendario || null,
      };

      const respuestaBackend: CalendarioLaboralResponse =
        await crearCalendarioLaboral(payload);

      const nuevoCalendarioUI: CalendarioFestivo = {
        id: respuestaBackend.id,
        empresa_id: respuestaBackend.empresa_id,
        centro_trabajo_id: respuestaBackend.centro_trabajo_id ?? "",
        nombre: respuestaBackend.nombre,
        anio: respuestaBackend.anio,
        festivos: [],
      };

      const actualizados = [...calendarioFestivos, nuevoCalendarioUI];
      setCalendarioFestivos(actualizados);
      setCalendarioSeleccionado(nuevoCalendarioUI);

      setAnoNuevoCalendario("");
      setNombreNuevoCalendario("");
      if (centrosConfigurados.length > 0) {
        setCentroNuevoCalendario(centrosConfigurados[0].id);
      }

      Alert.alert(
        "Éxito",
        `Calendario "${nuevoCalendarioUI.nombre}" registrado en la BD.`,
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "No se pudo crear el calendario en la base de datos.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleModificarCalendarioExistente = async () => {
    if (!calendarioSeleccionado || !calendarioSeleccionado.id) return;
    const anioNum = parseInt(editAnio, 10);

    if (!anioNum || isNaN(anioNum) || anioNum < 2020 || anioNum > 2100) {
      Alert.alert("Error", "Por favor, introduce un año válido (2020-2100).");
      return;
    }

    try {
      setGuardando(true);

      // Si editCentroId es un string vacío o solo espacios, mandamos null para no romper el UUID en el Backend
      const centroIdFinal =
        editCentroId && editCentroId.trim() !== "" ? editCentroId.trim() : null;

      const payload: CalendarioLaboralUpdate = {
        anio: anioNum,
        nombre: editNombre.trim() || `Calendario Anual ${anioNum}`,
        centro_trabajo_id: centroIdFinal,
      };

      const respuestaBackend: CalendarioLaboralResponse =
        await modificarCalendarioLaboral(calendarioSeleccionado.id, payload);

      // Actualizamos el estado de la lista mapeando de forma limpia
      const actualizados = calendarioFestivos.map((c) => {
        if (c.id === calendarioSeleccionado.id) {
          const modificado: CalendarioFestivo = {
            ...c,
            anio: respuestaBackend.anio,
            nombre: respuestaBackend.nombre,
            centro_trabajo_id: respuestaBackend.centro_trabajo_id ?? "",
          };
          return modificado;
        }
        return c;
      });

      setCalendarioFestivos(actualizados);

      // Sincronizamos el objeto seleccionado actual para que cambie el formulario al instante
      setCalendarioSeleccionado({
        ...calendarioSeleccionado,
        anio: respuestaBackend.anio,
        nombre: respuestaBackend.nombre,
        centro_trabajo_id: respuestaBackend.centro_trabajo_id ?? "",
      });

      setMostrarEdicionCampos(false);
      Alert.alert("Éxito", "Calendario laboral actualizado de forma correcta.");
    } catch (error) {
      console.error("Error al modificar calendario:", error);
      Alert.alert(
        "Error",
        "No se pudieron guardar los cambios del calendario.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCalendario = async () => {
    if (!calendarioSeleccionado || !calendarioSeleccionado.id) return;

    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar por completo este calendario laboral y todos sus días festivos asociados?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setGuardando(true);

              if (!calendarioSeleccionado.id) return;

              // Ejecutamos la petición de borrado en la API externa
              await eliminarCalendarioLaboral(calendarioSeleccionado.id);

              // Removemos el elemento eliminado del estado local de React
              const restantes = calendarioFestivos.filter(
                (c) => c.id !== calendarioSeleccionado.id,
              );
              setCalendarioFestivos(restantes);

              // Limpiamos la selección actual para restablecer la UI
              if (restantes.length > 0) {
                setCalendarioSeleccionado(restantes[0]);
              } else {
                setCalendarioSeleccionado(null);
              }

              setMostrarEdicionCampos(false);
              Alert.alert(
                "Éxito",
                "Calendario laboral eliminado correctamente.",
              );
            } catch (error) {
              console.error("Error al eliminar calendario:", error);
              Alert.alert(
                "Error",
                "No se pudo eliminar el calendario laboral de la base de datos.",
              );
            } finally {
              setGuardando(false);
            }
          },
        },
      ],
    );
  };

  const handleGuardarFestivoContextual = async () => {
    if (
      !diaSeleccionadoCtx ||
      !nuevaDescFestivo.trim() ||
      !empresaSeleccionada ||
      !calendarioSeleccionado ||
      !calendarioSeleccionado.id
    )
      return;

    try {
      setGuardando(true);

      const tipoValido: "Nacional" | "Autonómico" | "Local" =
        tipoFestivo.trim().toLowerCase() === "nacional"
          ? "Nacional"
          : tipoFestivo.trim().toLowerCase() === "autonómico"
            ? "Autonómico"
            : "Local";

      // 1. Buscamos si el festivo ya existe en el estado local actual
      const festivoExistente = calendarioSeleccionado.festivos.find(
        (f) => f.fecha === diaSeleccionadoCtx,
      );

      let festivoGuardadoBackend: Festivo;

      if (festivoExistente) {
        // 2. Si YA existe en la base de datos, llamamos a la API de edición mediante Query Params
        festivoGuardadoBackend = await editarFestivo(festivoExistente.id, {
          nueva_fecha: diaSeleccionadoCtx,
          nuevo_tipo: tipoValido,
          nueva_descripcion: nuevaDescFestivo.trim(),
        });
      } else {
        // 3. Si NO existe, llamamos a la API de creación enviando el body estructurado
        festivoGuardadoBackend = await crearFestivo({
          calendario_id: calendarioSeleccionado.id,
          fecha: diaSeleccionadoCtx,
          tipo: tipoValido,
          descripcion: nuevaDescFestivo.trim(),
        });
      }

      // 4. Sincronizamos las variables de estado locales de React con los datos reales devueltos por tu API
      const calendariosActualizados = calendarioFestivos.map((cal) => {
        if (cal.id === calendarioSeleccionado.id) {
          const existeFestivoLocal = cal.festivos.some(
            (f) => f.fecha === diaSeleccionadoCtx,
          );

          // Actualizamos usando una aserción de tipos para evitar problemas si la interfaz externa no lleva tilde
          const nuevosFestivos = existeFestivoLocal
            ? cal.festivos.map((f) =>
                f.fecha === diaSeleccionadoCtx
                  ? (festivoGuardadoBackend as any)
                  : f,
              )
            : [...cal.festivos, festivoGuardadoBackend as any];

          const objetoActualizado = { ...cal, festivos: nuevosFestivos };
          setCalendarioSeleccionado(objetoActualizado);
          return objetoActualizado;
        }
        return cal;
      });

      setCalendarioFestivos(calendariosActualizados as any[]);

      Alert.alert(
        "Éxito",
        festivoExistente
          ? `Festivo modificado correctamente.`
          : `Festivo registrado el ${diaSeleccionadoCtx}`,
      );

      // 5. Reseteamos los estados del modal
      setModalVisible(false);
      setNuevaDescFestivo("");
      setNuevoTipoFestivo("");
      setDiaSeleccionadoCtx(null);
    } catch (error: any) {
      // Capturamos el detalle del HTTP HTTPException enviado desde FastAPI si ocurre un error
      const msgError =
        error.response?.data?.detail ||
        "No se pudo sincronizar el festivo en el servidor.";
      Alert.alert("Error de Sincronización", msgError);
    } finally {
      setGuardando(false);
    }
  };

  const handleImportarCalendarioPDF = async () => {
    if (!calendarioSeleccionado || !calendarioSeleccionado.id) {
      Alert.alert(
        "Aviso",
        "Primero debes seleccionar un calendario laboral para poder importarle los festivos.",
      );
      return;
    }

    try {
      // 1. Abrir el explorador de archivos nativo filtrando por documentos PDF
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      // Si el usuario cancela, salimos silenciosamente
      if (
        resultado.canceled ||
        !resultado.assets ||
        resultado.assets.length === 0
      ) {
        return;
      }

      const archivoPdf = resultado.assets[0];
      setImportandoPdf(true);

      // 2. Empaquetar el archivo con la estructura exacta para React Native
      const formData = new FormData();

      if (Platform.OS === "web") {
        const respuestaBlob = await fetch(archivoPdf.uri);
        const blobReal = await respuestaBlob.blob();
        formData.append("file", blobReal, archivoPdf.name || "calendario.pdf");
      } else {
        formData.append("file", {
          uri: archivoPdf.uri,
          name: archivoPdf.name || "calendario.pdf",
          type: "application/pdf",
        } as any);
      }

      // 3. INVOCACIÓN AL SERVICIO DESACOPLADO
      const datosRespuesta = await importarCalendarioPDF(
        calendarioSeleccionado.id,
        formData,
      );

      // 4. Sincronización del estado local de React
      const festivosNuevos = datosRespuesta.festivos;

      const calendariosActualizados = calendarioFestivos.map((cal: any) => {
        if (cal.id === calendarioSeleccionado.id) {
          const objetoActualizado = {
            ...cal,
            festivos: [...(cal.festivos || []), ...festivosNuevos],
          };
          // Enfocamos de inmediato el calendario modificado
          setCalendarioSeleccionado(objetoActualizado);
          return objetoActualizado;
        }
        return cal;
      });

      setCalendarioFestivos(calendariosActualizados);

      Alert.alert(
        "Importación Exitosa",
        `¡Perfecto! Gemini ha analizado el PDF y se han autocompletado automáticamente ${datosRespuesta.total_importados} días festivos en la base de datos.`,
      );
    } catch (error: any) {
      console.error(
        "Error al importar calendario por medio del servicio:",
        error,
      );

      // Capturamos el detalle enviado de forma controlada por tu Exception Handler de FastAPI
      const msgError =
        error.response?.data?.detail ||
        error.message ||
        "No se pudo procesar o extraer el archivo PDF.";

      Alert.alert("Error de Importación", msgError);
    } finally {
      setImportandoPdf(false);
    }
  };

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

  const tieneCentrosValidos =
    centrosConfigurados && centrosConfigurados.length > 0;

  async function handleEditarCentro(centro: CentroTrabajo): Promise<void> {
    try {
      setGuardando(true);
      // Asumiendo que existe un servicio llamado editarCentroTrabajo(id, data)
      await editarCentroTrabajo(centro.id, {
        nombre: centro.nombre,
        direccion: centro.direccion ?? undefined,
        codigo_ccc: centro.codigo_ccc ?? undefined,
        zona_horaria: centro.zona_horaria,
      });

      // Actualizar estado local
      setCentrosConfigurados((prev) =>
        prev.map((c) => (c.id === centro.id ? { ...c, ...centro } : c)),
      );

      Alert.alert("Éxito", "Centro de trabajo actualizado.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el centro.");
    } finally {
      setGuardando(false);
    }
  }

  function handleEliminarCentro(centroId: string): void {
    Alert.alert("Confirmar", "¿Eliminar este centro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await eliminarCentroTrabajo(centroId);
            setCentrosConfigurados((prev) =>
              prev.filter((c) => c.id !== centroId),
            );
          } catch (error) {
            Alert.alert("Error", "No se pudo eliminar el centro.");
          }
        },
      },
    ]);
  }

  const handleEditarTurno = async (turno: ItemTurno) => {
    try {
      setGuardando(true);
      await editarTurno(turno.id, turno);
      setTurnosEstructurales((prev) =>
        prev.map((t) => (t.id === turno.id ? turno : t)),
      );
      Alert.alert("Éxito", "Turno actualizado correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el turno.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarTurno = async (turnoId: string) => {
    Alert.alert("Confirmar", "¿Eliminar este turno?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await eliminarTurno(turnoId);
            setTurnosEstructurales((prev) =>
              prev.filter((t) => t.id !== turnoId),
            );
          } catch (error) {
            Alert.alert("Error", "No se pudo eliminar el turno.");
          }
        },
      },
    ]);
  };

  const handleEditarDepartamento = async () => {
    if (!departamentoEnEdicion) return;

    try {
      setGuardando(true);
      const payload = {
        nombre: nombreDepto,
        centro_trabajo_id: centroTrabajoId || undefined,
      };

      await editarDepartamento(departamentoEnEdicion.id, payload);

      setDepartamentos((prev) =>
        prev.map((d) =>
          d.id === departamentoEnEdicion.id ? { ...d, ...payload } : d,
        ),
      );

      Alert.alert("Éxito", "Departamento actualizado.");

      setMostrarFormDepartamento(false);
      setDepartamentoEnEdicion(null);
      setNombreDepto("");
      setCentroTrabajoId(null);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el departamento.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarDepartamento = async (departamentoId: string) => {
    Alert.alert("Confirmar", "¿Eliminar este departamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await eliminarDepartamento(departamentoId);
            setDepartamentos((prev) =>
              prev.filter((d) => d.id !== departamentoId),
            );
          } catch (error) {
            Alert.alert("Error", "No se pudo eliminar el departamento.");
          }
        },
      },
    ]);
  };

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                "fiscal",
                "centros",
                "turnos",
                "departamentos",
                "calendario",
              ].map((tab) => (
                <Pressable
                  key={tab}
                  style={[
                    styles.tabButton,
                    tabActiva === tab && styles.tabButtonActivo,
                  ]}
                  onPress={() => setTabActiva(tab as TabConfig)}
                >
                  <ThemedText
                    style={[
                      styles.tabTexto,
                      tabActiva === tab && styles.tabTextoActivo,
                    ]}
                  >
                    {tab === "fiscal"
                      ? "Fiscal"
                      : tab === "centros"
                        ? "Centros de Trabajo"
                        : tab === "turnos"
                          ? "Turnos"
                          : tab === "departamentos"
                            ? "Departamentos"
                            : "Calendario Laboral"}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {empresaSeleccionada && (
          <View style={{ marginTop: 14 }}>
            <Card>
              {/* ======================================================== */}
              {/* TAB 1: FISCAL */}
              {/* ======================================================== */}
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

              {/* ======================================================== */}
              {/* TAB 2: CENTROS DE TRABAJO */}
              {/* ======================================================== */}
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
                    onPress={() => {
                      if (!mostrarFormCentro) {
                        setNombreCentro("");
                        setDireccionCentro("");
                        setZonaHoraria("");
                        setCodigoCcc("");
                      }
                      setMostrarFormCentro(!mostrarFormCentro);
                      setCentroEnEdicion(null);
                    }}
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
                          placeholder="Ej. Sede Principal"
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

                  {centrosConfigurados.map((centro: any) => (
                    <View key={centro.id}>
                      <View
                        style={[
                          styles.itemListaEstructural,
                          {
                            marginBottom: 10,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.nombreElementoLista}>
                            {centro.nombre}
                          </ThemedText>
                          <ThemedText style={styles.subtextoElementoLista}>
                            {centro.direccion || "Sin dirección"} •{" "}
                            {centro.zona_horaria}
                          </ThemedText>
                        </View>

                        <Row>
                          <Pressable
                            style={{
                              backgroundColor: "#475569",
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 16,
                              marginRight: 8,
                            }}
                            onPress={() => {
                              if (centroEnEdicion?.id === centro.id) {
                                setCentroEnEdicion(null);
                              } else {
                                setCentroEnEdicion(centro);
                                setNombreCentro(centro.nombre);
                                setDireccionCentro(centro.direccion || "");
                                setZonaHoraria(centro.zona_horaria || "");
                                setCodigoCcc(
                                  centro.codigo_ccc?.toString() || "",
                                );
                                setMostrarFormCentro(false);
                              }
                            }}
                          >
                            <ThemedText>✏️</ThemedText>
                          </Pressable>
                          <Pressable
                            style={{
                              backgroundColor: "#fee2e2",
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 16,
                            }}
                            onPress={() => handleEliminarCentro(centro.id)}
                          >
                            <ThemedText style={{ color: "#ef4444" }}>
                              🗑
                            </ThemedText>
                          </Pressable>
                        </Row>
                      </View>

                      {centroEnEdicion?.id === centro.id && (
                        <View style={styles.contenedorFormDesplegado}>
                          <ThemedText style={styles.formularioTitulo}>
                            Editar Centro
                          </ThemedText>
                          <View style={styles.campoFormulario}>
                            <ThemedText style={styles.labelInput}>
                              Nombre del Centro
                            </ThemedText>
                            <TextInput
                              style={styles.inputForm}
                              value={nombreCentro}
                              onChangeText={setNombreCentro}
                            />
                          </View>
                          <View style={styles.campoFormulario}>
                            <ThemedText style={styles.labelInput}>
                              Dirección
                            </ThemedText>
                            <TextInput
                              style={styles.inputForm}
                              value={direccionCentro}
                              onChangeText={setDireccionCentro}
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
                                Zona Horaria
                              </ThemedText>
                              <TextInput
                                style={styles.inputForm}
                                value={zonaHoraria}
                                onChangeText={setZonaHoraria}
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
                              />
                            </View>
                          </Row>
                          <Pressable
                            style={[
                              styles.botonGuardar,
                              { backgroundColor: "#EA580C", marginTop: 10 },
                            ]}
                            onPress={() => {
                              handleEditarCentro(centro);
                              setCentroEnEdicion(null);
                            }}
                          >
                            <ThemedText style={styles.textoBotonGuardar}>
                              Actualizar Cambios
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => setCentroEnEdicion(null)}
                            style={{ marginTop: 15 }}
                          >
                            <ThemedText
                              style={{ textAlign: "center", color: "#64748B" }}
                            >
                              Cancelar edición
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* ======================================================== */}
              {/* TAB 3: TURNOS */}
              {/* ======================================================== */}
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
                    onPress={() => {
                      if (!mostrarFormTurno) {
                        setNombreTurno("");
                        setHoraInicio("");
                        setHoraFin("");
                        setDuracionPausa("");
                      }
                      setMostrarFormTurno(!mostrarFormTurno);
                      setTurnoEnEdicion(null);
                    }}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      {mostrarFormTurno ? "✕ Cancelar" : "＋ Crear Turno"}
                    </ThemedText>
                  </Pressable>

                  {mostrarFormTurno && (
                    <View style={styles.contenedorFormDesplegado}>
                      <ThemedText style={styles.formularioTitulo}>
                        Estructurar Horarios y Turnos
                      </ThemedText>

                      <View style={styles.campoFormulario}>
                        <ThemedText style={styles.labelInput}>
                          Nombre del Turno
                        </ThemedText>
                        <TextInput
                          style={styles.inputForm}
                          value={nombreTurno}
                          onChangeText={setNombreTurno}
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
                          Guardar Turno
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  <ThemedText style={styles.subseccionTitulo}>
                    Turnos
                  </ThemedText>

                  {turnosEstructurales.map((turno: ItemTurno) => (
                    <View key={turno.id}>
                      <View
                        style={[
                          styles.itemListaEstructural,
                          {
                            marginBottom: 10,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.nombreElementoLista}>
                            {turno.nombre.toUpperCase()}
                          </ThemedText>
                          <ThemedText style={styles.subtextoElementoLista}>
                            Horario: {turno.hora_inicio.substring(0, 5)} a{" "}
                            {turno.hora_fin.substring(0, 5)}
                          </ThemedText>
                        </View>

                        <Row>
                          <Pressable
                            style={{
                              backgroundColor: "#475569",
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 16,
                              marginRight: 8,
                            }}
                            onPress={() => {
                              if (turnoEnEdicion?.id === turno.id) {
                                setTurnoEnEdicion(null);
                              } else {
                                setTurnoEnEdicion(turno);
                                setNombreTurno(turno.nombre);
                                setHoraInicio(turno.hora_inicio);
                                setHoraFin(turno.hora_fin);
                                setDuracionPausa(
                                  turno.minutos_pausa_obligatoria?.toString() ||
                                    "",
                                );
                                setMostrarFormTurno(false);
                              }
                            }}
                          >
                            <ThemedText>✏️</ThemedText>
                          </Pressable>
                          <Pressable
                            style={{
                              backgroundColor: "#fee2e2",
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 16,
                            }}
                            onPress={() => handleEliminarTurno(turno.id)}
                          >
                            <ThemedText style={{ color: "#ef4444" }}>
                              🗑
                            </ThemedText>
                          </Pressable>
                        </Row>
                      </View>

                      {turnoEnEdicion?.id === turno.id && (
                        <View style={styles.contenedorFormDesplegado}>
                          <ThemedText style={styles.formularioTitulo}>
                            Editar Turno
                          </ThemedText>

                          <View style={styles.campoFormulario}>
                            <ThemedText style={styles.labelInput}>
                              Nombre del Turno
                            </ThemedText>
                            <TextInput
                              style={styles.inputForm}
                              value={nombreTurno}
                              onChangeText={setNombreTurno}
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
                            />
                          </View>

                          <Pressable
                            style={[
                              styles.botonGuardar,
                              { backgroundColor: "#16A34A", marginTop: 10 },
                            ]}
                            onPress={() => {
                              handleEditarTurno(turno);
                              setTurnoEnEdicion(null);
                            }}
                          >
                            <ThemedText style={styles.textoBotonGuardar}>
                              Actualizar Cambios
                            </ThemedText>
                          </Pressable>

                          <Pressable
                            onPress={() => setTurnoEnEdicion(null)}
                            style={{ marginTop: 15 }}
                          >
                            <ThemedText
                              style={{ textAlign: "center", color: "#64748B" }}
                            >
                              Cancelar edición
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* ======================================================== */}
              {/* TAB 4: DEPARTAMENTOS */}
              {/* ======================================================== */}
              {tabActiva === "departamentos" && (
                <View>
                  <Pressable
                    style={[
                      styles.botonAccionHeader,
                      {
                        backgroundColor: mostrarFormDepartamento
                          ? "#64748B"
                          : "#7C3AED",
                      },
                    ]}
                    onPress={() => {
                      if (!mostrarFormDepartamento) {
                        setNombreDepto("");
                        setCentroTrabajoId(null);
                      }
                      setMostrarFormDepartamento(!mostrarFormDepartamento);
                      setDepartamentoEnEdicion(null); // Cierra cualquier edición activa
                    }}
                  >
                    <ThemedText style={styles.textoBotonGuardar}>
                      {mostrarFormDepartamento
                        ? "✕ Cancelar"
                        : "＋ Añadir Departamento"}
                    </ThemedText>
                  </Pressable>

                  {mostrarFormDepartamento && (
                    <View style={styles.contenedorFormDesplegado}>
                      <ThemedText style={styles.formularioTitulo}>
                        Nuevo Departamento
                      </ThemedText>
                      <View style={styles.campoFormulario}>
                        <ThemedText style={styles.labelInput}>
                          Nombre del Departamento *
                        </ThemedText>
                        <TextInput
                          style={styles.inputForm}
                          value={nombreDepto}
                          onChangeText={setNombreDepto}
                          placeholder="Ej. Recursos Humanos"
                        />
                      </View>
                      <View style={styles.campoFormulario}>
                        <ThemedText style={styles.labelInput}>
                          Centro de Trabajo
                        </ThemedText>
                        <Picker
                          selectedValue={centroTrabajoId}
                          onValueChange={setCentroTrabajoId}
                        >
                          <Picker.Item
                            label="Seleccionar centro..."
                            value={null}
                          />
                          {centrosConfigurados.map((ct: any) => (
                            <Picker.Item
                              key={ct.id}
                              label={ct.nombre}
                              value={ct.id}
                            />
                          ))}
                        </Picker>
                      </View>
                      <Pressable
                        style={[
                          styles.botonGuardar,
                          { backgroundColor: "#7C3AED" },
                        ]}
                        onPress={handleCrearDepartamento}
                      >
                        <ThemedText style={styles.textoBotonGuardar}>
                          Guardar Departamento
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  <ThemedText style={styles.subseccionTitulo}>
                    Departamentos Activos
                  </ThemedText>

                  {departamentos.map((dept: any) => {
                    const centro = centrosConfigurados.find(
                      (c: any) => c.id === dept.centro_trabajo_id,
                    );

                    return (
                      <View key={dept.id}>
                        <View
                          style={[
                            styles.itemListaEstructural,
                            {
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <View>
                            <ThemedText style={styles.nombreElementoLista}>
                              {dept.nombre}
                            </ThemedText>
                            <ThemedText
                              style={{ fontSize: 12, color: "#64748B" }}
                            >
                              {centro
                                ? `📍 ${centro.nombre}`
                                : "Sin centro asignado"}
                            </ThemedText>
                          </View>

                          <Row>
                            <Pressable
                              style={{
                                backgroundColor: "#475569",
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 16,
                                marginRight: 8,
                              }}
                              onPress={() => {
                                if (departamentoEnEdicion?.id === dept.id) {
                                  setDepartamentoEnEdicion(null);
                                } else {
                                  setDepartamentoEnEdicion(dept);
                                  setNombreDepto(dept.nombre);
                                  setCentroTrabajoId(
                                    dept.centro_trabajo_id || null,
                                  );
                                  setMostrarFormDepartamento(false);
                                }
                              }}
                            >
                              <ThemedText>✏️</ThemedText>
                            </Pressable>
                            <Pressable
                              style={{
                                backgroundColor: "#fee2e2",
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 16,
                              }}
                              onPress={() =>
                                handleEliminarDepartamento(dept.id)
                              }
                            >
                              <ThemedText style={{ color: "#ef4444" }}>
                                🗑
                              </ThemedText>
                            </Pressable>
                          </Row>
                        </View>

                        {/* Formulario de EDICIÓN */}
                        {departamentoEnEdicion?.id === dept.id && (
                          <View style={styles.contenedorFormDesplegado}>
                            <ThemedText style={styles.formularioTitulo}>
                              Editar: {dept.nombre}
                            </ThemedText>
                            <TextInput
                              style={styles.inputForm}
                              value={nombreDepto}
                              onChangeText={setNombreDepto}
                            />
                            <Picker
                              selectedValue={centroTrabajoId}
                              onValueChange={setCentroTrabajoId}
                            >
                              <Picker.Item
                                label="Seleccionar centro..."
                                value={null}
                              />
                              {centrosConfigurados.map((ct: any) => (
                                <Picker.Item
                                  key={ct.id}
                                  label={ct.nombre}
                                  value={ct.id}
                                />
                              ))}
                            </Picker>
                            <Pressable
                              style={[
                                styles.botonGuardar,
                                { backgroundColor: "#7C3AED", marginTop: 10 },
                              ]}
                              onPress={() => {
                                handleEditarDepartamento();
                                setDepartamentoEnEdicion(null);
                              }}
                            >
                              <ThemedText style={styles.textoBotonGuardar}>
                                Actualizar Cambios
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              onPress={() => setDepartamentoEnEdicion(null)}
                              style={{ marginTop: 10 }}
                            >
                              <ThemedText
                                style={{
                                  textAlign: "center",
                                  color: "#525153",
                                }}
                              >
                                Cancelar
                              </ThemedText>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ======================================================== */}
              {/* TAB 5: CALENDARIO LABORAL */}
              {/* ======================================================== */}
              {tabActiva === "calendario" && (
                <View>
                  <ThemedText style={styles.formularioTitulo}>
                    Gestión de Calendarios Anuales
                  </ThemedText>

                  <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <Pressable
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#0284C7",
                        paddingVertical: 12,
                        borderRadius: 8,
                        opacity: importandoPdf ? 0.6 : 1,
                        boxShadow: "0px 1px 1.41px rgba(0, 0, 0, 0.2)",
                        elevation: 2,
                      }}
                      onPress={handleImportarCalendarioPDF}
                      disabled={importandoPdf}
                    >
                      {importandoPdf ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText
                          style={{
                            color: "#FFFFFF",
                            fontWeight: "700",
                            fontSize: 14,
                          }}
                        >
                          📄 Autocompletar calendario desde PDF (IA)
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.contenedorFormDesplegado}>
                    <ThemedText style={styles.labelInput}>
                      1. Centro de Trabajo Destino *
                    </ThemedText>

                    {!tieneCentrosValidos ? (
                      <View style={styles.bannerError}>
                        <ThemedText style={styles.textoBannerError}>
                          ⚠️ No existen centros de trabajo registrados. Dirígete
                          primero a la pestaña 'Centros de Trabajo' para añadir
                          al menos uno antes de continuar.
                        </ThemedText>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 14, marginTop: 4 }}
                      >
                        {centrosConfigurados.map((centro) => {
                          const esEsteCentro =
                            centroNuevoCalendario === centro.id;
                          return (
                            <Pressable
                              key={centro.id}
                              style={[
                                styles.chipAno,
                                esEsteCentro && { backgroundColor: "#2563EB" },
                              ]}
                              onPress={() =>
                                setCentroNuevoCalendario(centro.id)
                              }
                            >
                              <ThemedText
                                style={{
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color: esEsteCentro ? "#FFFFFF" : "#475569",
                                }}
                              >
                                {centro.nombre} {esEsteCentro ? "✓" : ""}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}

                    <ThemedText style={styles.labelInput}>
                      2. Identificación del Calendario
                    </ThemedText>

                    <TextInput
                      style={[styles.inputForm, { marginBottom: 10 }]}
                      placeholder="Nombre (Ej: Sede Madrid 2026)"
                      value={nombreNuevoCalendario}
                      onChangeText={setNombreNuevoCalendario}
                      editable={tieneCentrosValidos}
                    />

                    <Row>
                      <TextInput
                        style={[styles.inputForm, { flex: 1, marginRight: 10 }]}
                        placeholder="Año (Ej. 2026)"
                        keyboardType="numeric"
                        maxLength={4}
                        value={anoNuevoCalendario}
                        onChangeText={setAnoNuevoCalendario}
                        editable={tieneCentrosValidos}
                      />
                      <Pressable
                        style={[
                          styles.botonGuardar,
                          {
                            marginTop: 0,
                            paddingHorizontal: 20,
                            height: 44,
                            backgroundColor: !tieneCentrosValidos
                              ? "#94A3B8"
                              : "#2563EB",
                          },
                        ]}
                        onPress={handleCrearCalendarioAnual}
                        disabled={guardando || !tieneCentrosValidos}
                      >
                        <ThemedText style={styles.textoBotonGuardar}>
                          ＋ Inicializar
                        </ThemedText>
                      </Pressable>
                    </Row>
                  </View>

                  <ThemedText style={styles.subseccionTitulo}>
                    Calendarios Disponibles
                  </ThemedText>
                  {calendarioFestivos.length > 0 ? (
                    <View>
                      {/* Contenedor horizontal para scroll de los chips */}
                      <View style={styles.contenedorFiltroAnual}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <Row>
                            {calendarioFestivos.map(
                              (cal: CalendarioFestivo) => {
                                const idDelCentro = cal.centro_trabajo_id;

                                // Buscamos el centro en el estado de la app
                                const centroAsociado = centrosConfigurados.find(
                                  (c) => c.id === idDelCentro,
                                );

                                // Si encontramos el centro ponemos su nombre, si no, es Global
                                const nombreCentro = centroAsociado?.nombre
                                  ? centroAsociado.nombre
                                  : "Global Empresa";

                                // Construimos la etiqueta final de forma limpia sin usar .concat()
                                const displayLabel = cal.nombre
                                  ? `${cal.nombre} (${nombreCentro})`
                                  : `Año ${cal.anio} (${nombreCentro})`;
                                const estaSeleccionado =
                                  calendarioSeleccionado?.id === cal.id;

                                return (
                                  <Pressable
                                    key={cal.id || cal.anio.toString()}
                                    style={[
                                      styles.chipAno,
                                      estaSeleccionado &&
                                        styles.chipAnoSeleccionado,
                                    ]}
                                    onPress={() => {
                                      setCalendarioSeleccionado(cal);
                                      setMostrarEdicionCampos(false);
                                    }}
                                  >
                                    <ThemedText
                                      style={[
                                        styles.chipAnoTexto,
                                        estaSeleccionado &&
                                          styles.chipAnoTextoSeleccionado,
                                      ]}
                                    >
                                      {displayLabel}
                                    </ThemedText>
                                  </Pressable>
                                );
                              },
                            )}
                          </Row>
                        </ScrollView>
                      </View>

                      {/* Botones de acción para el calendario seleccionado */}
                      <Row>
                        <Pressable
                          style={{
                            backgroundColor: "#475569",
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 16,
                            marginRight: 8,
                          }}
                          onPress={() => {
                            setMostrarEdicionCampos(!mostrarEdicionCampos);
                          }}
                        >
                          <ThemedText style={[styles.textoBotonGuardar]}>
                            ✏️ {mostrarEdicionCampos ? "Cerrar" : "Cambiar"}
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          style={{
                            backgroundColor: "#EF4444",
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 16,
                            marginRight: 8,
                          }}
                          onPress={handleEliminarCalendario}
                          disabled={guardando}
                        >
                          <ThemedText style={[styles.textoBotonGuardar]}>
                            🗑 Borrar
                          </ThemedText>
                        </Pressable>
                      </Row>
                    </View>
                  ) : (
                    <ThemedText style={styles.textoVacio}>
                      No se han inicializado cuadrantes para esta empresa.
                    </ThemedText>
                  )}

                  {calendarioSeleccionado && (
                    <View
                      style={{
                        marginTop: 15,
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      {mostrarEdicionCampos && (
                        <View
                          style={[
                            styles.contenedorFormDesplegado,
                            {
                              backgroundColor: "#F1F5F9",
                              borderColor: "#CBD5E1",
                              width: "100%",
                              marginTop: 10,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[styles.subseccionTitulo, { marginTop: 0 }]}
                          >
                            Modificar Información del Calendario
                          </ThemedText>

                          <View style={styles.campoFormulario}>
                            <ThemedText style={styles.labelInput}>
                              Nombre Descriptivo
                            </ThemedText>
                            <TextInput
                              style={styles.inputForm}
                              value={editNombre}
                              onChangeText={setEditNombre}
                            />
                          </View>

                          <View style={styles.campoFormulario}>
                            <ThemedText style={styles.labelInput}>
                              Año del Cuadrante
                            </ThemedText>
                            <TextInput
                              style={styles.inputForm}
                              value={editAnio}
                              onChangeText={setEditAnio}
                              keyboardType="numeric"
                              maxLength={4}
                            />
                          </View>

                          <View style={styles.campoFormulario}>
                            <ThemedText style={styles.labelInput}>
                              Centro de Trabajo Asignado
                            </ThemedText>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              style={{ marginTop: 4 }}
                            >
                              {centrosConfigurados.map((centro) => {
                                const esEsteCentro = editCentroId === centro.id;
                                return (
                                  <Pressable
                                    key={centro.id}
                                    style={[
                                      styles.chipAno,
                                      esEsteCentro && {
                                        backgroundColor: "#0F172A",
                                      },
                                    ]}
                                    onPress={() => setEditCentroId(centro.id)}
                                  >
                                    <ThemedText
                                      style={{
                                        fontSize: 11,
                                        fontWeight: "600",
                                        color: esEsteCentro
                                          ? "#FFFFFF"
                                          : "#475569",
                                      }}
                                    >
                                      {centro.nombre} {esEsteCentro ? "✓" : ""}
                                    </ThemedText>
                                  </Pressable>
                                );
                              })}
                            </ScrollView>
                          </View>

                          <Pressable
                            style={[
                              styles.botonGuardar,
                              {
                                backgroundColor: "#0F172A",
                                height: 40,
                                marginTop: 5,
                              },
                            ]}
                            onPress={handleModificarCalendarioExistente}
                            disabled={guardando}
                          >
                            <ThemedText style={styles.textoBotonGuardar}>
                              Guardar Cambios del Calendario
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}

                      <ThemedText
                        style={[
                          styles.ayudaTexto,
                          { marginTop: 12, alignSelf: "flex-start" },
                        ]}
                      >
                        Presiona sobre cualquier día para asignarlo como
                        Festivo/No Laborable.
                      </ThemedText>

                      <CalendarLaboralAnual
                        year={Number(calendarioSeleccionado.anio)}
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
              style={[styles.inputForm, { marginBottom: 20 }]}
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
    paddingHorizontal: 16,
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
