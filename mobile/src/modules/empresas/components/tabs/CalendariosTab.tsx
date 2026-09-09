import { CalendarLaboralAnual } from "@/src/shared/components/Calendar";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { Row } from "@/src/shared/ui/AppSurface";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import { validarAnioRango } from "@/src/utils/validators";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import {
  actualizarCalendarioLaboral,
  crearCalendarioLaboral,
  eliminarCalendarioLaboral,
  importarCalendarioPDF,
} from "../../../calendarios-laborales/api/services";
import {
  CalendarioFestivo,
  CalendarioLaboralCreate,
  CalendarioLaboralResponse,
  CalendarioLaboralUpdate,
} from "../../../calendarios-laborales/types/calendario";
import { CentroTrabajo } from "../../../centros-trabajo/types/centro-trabajo";
import { crearFestivo, editarFestivo } from "../../../festivos/api/services";
import { Festivo } from "../../../festivos/types/festivo";
import { Empresa } from "../../types/empresa";

/**
 * Propiedades requeridas para el funcionamiento del custom hook useTabCalendario.
 * Define todas las variables de estado global y funciones de actualización necesarias
 * para la gestión de calendarios y días festivos.
 */
interface UseTabCalendarioProps {
  /** Lista completa de calendarios festivos asociados a la empresa actual. */
  calendariosEmpresa: CalendarioFestivo[];
  /** Función para actualizar el estado del listado de calendarios de la empresa. */
  setCalendariosEmpresa: React.Dispatch<
    React.SetStateAction<CalendarioFestivo[]>
  >;
  /** Listado de centros de trabajo disponibles para asociar a los calendarios. */
  centrosEmpresa: CentroTrabajo[];
  /** Empresa que se encuentra seleccionada en el contexto actual de la aplicación. */
  empresaActual: Empresa;
  /** Calendario laboral que el usuario ha seleccionado para visualizar o editar. */
  calendarioActual: CalendarioFestivo | null;
  /** Función para actualizar el calendario seleccionado actualmente. */
  setCalendarioActual: (calendario: CalendarioFestivo | null) => void;
  /** Valor en texto del año en curso para el formulario de edición. */
  editAnio: string;
  /** Valor en texto del nombre descriptivo para el formulario de edición. */
  editNombre: string;
  /** Identificador del centro de trabajo asociado en el modo de edición. */
  editCentroId: string | null;
  /** Función para actualizar el año en el formulario de edición. */
  setEditAnio: (anio: string) => void;
  /** Función para actualizar el nombre en el formulario de edición. */
  setEditNombre: (nombre: string) => void;
  /** Función para actualizar el identificador del centro en el modo de edición. */
  setEditCentroId: (centroId: string | null) => void;
  /** Estado booleano que indica si se está ejecutando una operación asíncrona de guardado. */
  guardando: boolean;
  /** Función para actualizar el estado booleano de guardado. */
  setGuardando: (guardando: boolean) => void;
}

/**
 * Hook personalizado que encapsula toda la lógica de negocio, manejo de estados,
 * llamadas a servicios y validaciones para la gestión de calendarios laborales.
 *
 * @param props - Propiedades de configuración y estados compartidos del componente padre.
 * @returns Objeto con estados locales y funciones manejadoras de acciones de calendario.
 */
export function useTabCalendario({
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
}: UseTabCalendarioProps) {
  const [anoNuevoCalendario, setAnoNuevoCalendario] = useState("");
  const [nombreNuevoCalendario, setNombreNuevoCalendario] = useState("");
  const [centroNuevoCalendario, setCentroNuevoCalendario] =
    useState<string>("");
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [mostrarEdicionCampos, setMostrarEdicionCampos] = useState(false);
  const [diaSeleccionadoCtx, setDiaSeleccionadoCtx] = useState<string | null>(
    null,
  );
  const [nuevaDescFestivo, setNuevaDescFestivo] = useState("");
  const [tipoFestivo, setNuevoTipoFestivo] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  /**
   * Efecto para sincronizar el centro de trabajo por defecto al actualizar la lista de centros.
   */
  useEffect(() => {
    if (centrosEmpresa && centrosEmpresa.length > 0) {
      setCentroNuevoCalendario(centrosEmpresa[0].id);
    } else {
      setCentroNuevoCalendario("");
    }
  }, [centrosEmpresa]);

  /**
   * Efecto para actualizar los campos de edición cuando se selecciona un calendario diferente.
   */
  useEffect(() => {
    if (calendarioActual) {
      setEditAnio(String(calendarioActual.anio));
      setEditNombre(calendarioActual.nombre);
      setEditCentroId(calendarioActual.centro_trabajo_id);
    }
  }, [calendarioActual]);

  const tieneCentrosValidos = centrosEmpresa && centrosEmpresa.length > 0;

  /**
   * Valida los datos introducidos y ejecuta la petición para registrar un nuevo calendario laboral.
   */
  const handleCrearCalendario = async () => {
    if (!tieneCentrosValidos) {
      mostrarMensaje(
        "Acción Bloqueada",
        "No se puede crear un calendario si la empresa no tiene centros de trabajo.",
      );
      return;
    }

    const ano = validarAnioRango(anoNuevoCalendario);
    if (!ano || !empresaActual) {
      mostrarMensaje(
        "Año inválido",
        "Introduce un año válido entre 2020 y 2100.",
      );
      return;
    }

    try {
      setGuardando(true);
      const payload: CalendarioLaboralCreate = {
        empresa_id: empresaActual.id,
        anio: ano,
        nombre: nombreNuevoCalendario.trim() || `Calendario Anual ${ano}`,
        centro_trabajo_id: centroNuevoCalendario,
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

      setCalendariosEmpresa([...calendariosEmpresa, nuevoCalendarioUI]);
      setCalendarioActual(nuevoCalendarioUI);
      setAnoNuevoCalendario("");
      setNombreNuevoCalendario("");
      if (centrosEmpresa.length > 0) {
        setCentroNuevoCalendario(centrosEmpresa[0].id);
      }

      mostrarMensaje(
        "Éxito",
        `Calendario "${nuevoCalendarioUI.nombre}" registrado en la BD.`,
      );
    } catch (error: any) {
      mostrarError(
        "Error al crear el calendario laboral en el servidor: " + error,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Actualiza la información descriptiva y de asignación del calendario laboral seleccionado actualmente.
   */
  const handleEditarCalendario = async () => {
    if (!calendarioActual?.id) return;

    const anioNum = validarAnioRango(editAnio);
    if (!anioNum) {
      mostrarMensaje(
        "Año inválido",
        "Por favor, introduce un año válido (2020-2100).",
      );
      return;
    }

    try {
      setGuardando(true);
      const payload: CalendarioLaboralUpdate = {
        anio: anioNum,
        nombre: editNombre.trim() || `Calendario Anual ${anioNum}`,
        centro_trabajo_id: editCentroId!,
      };

      const respuestaBackend: CalendarioLaboralResponse =
        await actualizarCalendarioLaboral(calendarioActual.id, payload);

      const actualizados = calendariosEmpresa.map((c) => {
        if (c.id === calendarioActual.id) {
          return {
            ...c,
            anio: respuestaBackend.anio,
            nombre: respuestaBackend.nombre,
            centro_trabajo_id: respuestaBackend.centro_trabajo_id,
          };
        }
        return c;
      });

      setCalendariosEmpresa(actualizados);
      setCalendarioActual({
        ...calendarioActual,
        anio: respuestaBackend.anio,
        nombre: respuestaBackend.nombre,
        centro_trabajo_id: respuestaBackend.centro_trabajo_id,
      });

      setMostrarEdicionCampos(false);
      mostrarMensaje(
        "Éxito",
        "Calendario laboral actualizado de forma correcta.",
      );
    } catch (error: any) {
      mostrarError(
        "Error al actualizar la información del calendario: " + error,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Realiza la llamada asíncrona para eliminar el calendario seleccionado y actualiza el estado local.
   */
  const ejecutarEliminacion = async () => {
    if (!calendarioActual?.id) return;
    try {
      setGuardando(true);
      await eliminarCalendarioLaboral(calendarioActual.id);

      const restantes = calendariosEmpresa.filter(
        (c) => c.id !== calendarioActual.id,
      );
      setCalendariosEmpresa(restantes);
      setCalendarioActual(restantes.length > 0 ? restantes[0] : null);
      setMostrarEdicionCampos(false);
      mostrarMensaje("Éxito", "Calendario laboral eliminado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al intentar eliminar el calendario laboral: " + error,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Muestra un cuadro de diálogo de confirmación adaptado a la plataforma (Web o Nativa) para borrar el calendario.
   */
  const handleEliminarCalendario = () => {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "¿Estás seguro de que deseas eliminar por completo este calendario laboral?",
        )
      ) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        "¿Estás seguro de que deseas eliminar por completo este calendario laboral y todos sus días festivos asociados?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: ejecutarEliminacion,
          },
        ],
      );
    }
  };

  /**
   * Maneja la interacción al presionar un día específico en el componente de calendario visual.
   *
   * @param fechaStr - Fecha seleccionada en formato string YYYY-MM-DD.
   * @param festivoExistente - Datos del festivo si ya existía registrado en dicha fecha.
   */
  const handleDayPress = (fechaStr: string, festivoExistente?: Festivo) => {
    setDiaSeleccionadoCtx(fechaStr);
    setNuevaDescFestivo(festivoExistente?.descripcion || "");
    setNuevoTipoFestivo(festivoExistente?.tipo || "");
    setModalVisible(true);
  };

  /**
   * Guarda o actualiza la información de un día festivo contextual asociado al calendario activo.
   */
  const handleGuardarFestivoContextual = async () => {
    if (
      !diaSeleccionadoCtx ||
      !nuevaDescFestivo.trim() ||
      !calendarioActual?.id
    )
      return;

    try {
      setGuardando(true);
      const tipoLower = tipoFestivo.trim().toLowerCase();
      const tipoValido: "Nacional" | "Autonómico" | "Local" =
        tipoLower === "nacional"
          ? "Nacional"
          : tipoLower === "autonómico"
            ? "Autonómico"
            : "Local";

      const festivoExistente = calendarioActual.festivos.find(
        (f) => f.fecha === diaSeleccionadoCtx,
      );

      let festivoGuardadoBackend: Festivo;

      if (festivoExistente) {
        festivoGuardadoBackend = await editarFestivo(festivoExistente.id, {
          calendario_id: calendarioActual.id,
          fecha: diaSeleccionadoCtx,
          tipo: tipoValido,
          descripcion: nuevaDescFestivo.trim(),
        });
      } else {
        festivoGuardadoBackend = await crearFestivo({
          calendario_id: calendarioActual.id,
          fecha: diaSeleccionadoCtx,
          tipo: tipoValido,
          descripcion: nuevaDescFestivo.trim(),
        });
      }

      const calendariosActualizados = calendariosEmpresa.map((cal) => {
        if (cal.id === calendarioActual.id) {
          const existeFestivoLocal = cal.festivos.some(
            (f) => f.fecha === diaSeleccionadoCtx,
          );
          const nuevosFestivos = existeFestivoLocal
            ? cal.festivos.map((f) =>
                f.fecha === diaSeleccionadoCtx ? festivoGuardadoBackend : f,
              )
            : [...cal.festivos, festivoGuardadoBackend];

          const objetoActualizado = { ...cal, festivos: nuevosFestivos };
          setCalendarioActual(objetoActualizado);
          return objetoActualizado;
        }
        return cal;
      });

      setCalendariosEmpresa(calendariosActualizados);
      mostrarMensaje(
        "Éxito",
        festivoExistente
          ? "Festivo modificado correctamente."
          : `Festivo registrado el ${diaSeleccionadoCtx}`,
      );

      setModalVisible(false);
      setNuevaDescFestivo("");
      setNuevoTipoFestivo("");
      setDiaSeleccionadoCtx(null);
    } catch (error: any) {
      mostrarError("Error al guardar o actualizar el día festivo: " + error);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Permite seleccionar un archivo PDF mediante el selector de documentos y procesa su importación masiva de festivos.
   */
  const handleImportarCalendarioPDF = async () => {
    if (!calendarioActual?.id) {
      mostrarMensaje(
        "Aviso",
        "Primero debes seleccionar un calendario laboral para poder importarle los festivos.",
      );
      return;
    }

    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (
        resultado.canceled ||
        !resultado.assets ||
        resultado.assets.length === 0
      ) {
        return;
      }

      const archivoPdf = resultado.assets[0];
      setImportandoPdf(true);
      setGuardando(true);
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
        } as unknown as Blob);
      }

      const datosRespuesta = await importarCalendarioPDF(
        calendarioActual.id,
        formData,
      );
      const festivosNuevos = datosRespuesta.festivos;

      const calendariosActualizados = calendariosEmpresa.map((cal) => {
        if (cal.id === calendarioActual.id) {
          const objetoActualizado = {
            ...cal,
            festivos: [...(cal.festivos || []), ...festivosNuevos],
          };
          setCalendarioActual(objetoActualizado);
          return objetoActualizado;
        }
        return cal;
      });

      setCalendariosEmpresa(calendariosActualizados);
      mostrarMensaje(
        "Importación Exitosa",
        `¡Perfecto! Se han autocompletado automáticamente ${datosRespuesta.total_importados} días festivos.`,
      );
    } catch (error: any) {
      mostrarError(
        "Error al procesar e importar el archivo PDF del calendario: " + error,
      );
    } finally {
      setImportandoPdf(false);
      setGuardando(false);
    }
  };

  return {
    anoNuevoCalendario,
    setAnoNuevoCalendario,
    nombreNuevoCalendario,
    setNombreNuevoCalendario,
    centroNuevoCalendario,
    setCentroNuevoCalendario,
    importandoPdf,
    mostrarEdicionCampos,
    setMostrarEdicionCampos,
    diaSeleccionadoCtx,
    nuevaDescFestivo,
    setNuevaDescFestivo,
    tipoFestivo,
    setNuevoTipoFestivo,
    modalVisible,
    setModalVisible,
    tieneCentrosValidos,
    handleCrearCalendario,
    handleEditarCalendario,
    handleEliminarCalendario,
    handleDayPress,
    handleGuardarFestivoContextual,
    handleImportarCalendarioPDF,
  };
}

/**
 * Propiedades extendidas para el componente visual TabCalendario.
 */
interface TabCalendarioProps extends UseTabCalendarioProps {
  styles: Record<string, any>;
}

/**
 * Componente funcional encargado de renderizar la interfaz gráfica de la pestaña de calendarios laborales,
 * incluyendo formularios de creación, edición, selectores e integración con el calendario anual.
 *
 * @param props - Propiedades que incluyen estados de negocio y estilos de la aplicación.
 * @returns Estructura visual en React Native para la pestaña de calendarios.
 */
export default function TabCalendario({
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
}: TabCalendarioProps) {
  const {
    anoNuevoCalendario,
    setAnoNuevoCalendario,
    nombreNuevoCalendario,
    setNombreNuevoCalendario,
    centroNuevoCalendario,
    setCentroNuevoCalendario,
    importandoPdf,
    mostrarEdicionCampos,
    setMostrarEdicionCampos,
    tieneCentrosValidos,
    handleCrearCalendario,
    handleEditarCalendario,
    handleEliminarCalendario,
    handleDayPress,
    handleImportarCalendarioPDF,
  } = useTabCalendario({
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
  });

  return (
    <View>
      <ThemedText style={styles.formularioTitulo}>
        Gestión de Calendarios Anuales
      </ThemedText>

      {/* Botón de Importar PDF */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0284C7",
              paddingVertical: 12,
              borderRadius: 8,
              elevation: 2,
            },
            (importandoPdf || guardando) && { opacity: 0.6 },
          ]}
          onPress={handleImportarCalendarioPDF}
          disabled={importandoPdf || guardando}
        >
          {importandoPdf ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText
              style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}
            >
              📄 Importar calendario en PDF
            </ThemedText>
          )}
        </Pressable>
      </View>

      {/* Formulario de Inicialización */}
      <View style={styles.contenedorFormDesplegado}>
        <ThemedText style={styles.labelInput}>
          1. Centro de Trabajo Destino *
        </ThemedText>

        {!tieneCentrosValidos ? (
          <View style={styles.bannerError}>
            <ThemedText style={styles.textoBannerError}>
              ⚠️ No existen centros de trabajo registrados. Dirígete primero a
              la pestaña 'Centros de Trabajo'.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14, marginTop: 4 }}
          >
            {centrosEmpresa.map((centro) => {
              const esEsteCentro = centroNuevoCalendario === centro.id;
              return (
                <Pressable
                  key={centro.id}
                  style={[
                    styles.chipAno,
                    esEsteCentro && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={() => setCentroNuevoCalendario(centro.id)}
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
          editable={tieneCentrosValidos && !guardando}
        />

        <Row>
          <TextInput
            style={[styles.inputForm, { flex: 1, marginRight: 10 }]}
            placeholder="Año (Ej. 2026)"
            keyboardType="numeric"
            maxLength={4}
            value={anoNuevoCalendario}
            onChangeText={setAnoNuevoCalendario}
            editable={tieneCentrosValidos && !guardando}
          />
          <Pressable
            style={[
              styles.botonGuardar,
              {
                marginTop: 0,
                paddingHorizontal: 20,
                height: 44,
                backgroundColor: !tieneCentrosValidos ? "#94A3B8" : "#2563EB",
              },
              guardando && { opacity: 0.7 },
            ]}
            onPress={handleCrearCalendario}
            disabled={guardando || !tieneCentrosValidos}
          >
            {guardando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.textoBotonGuardar}>
                ＋ Inicializar
              </ThemedText>
            )}
          </Pressable>
        </Row>
      </View>

      <ThemedText style={styles.subseccionTitulo}>
        Calendarios Disponibles
      </ThemedText>

      {calendariosEmpresa.length > 0 ? (
        <View>
          <View style={styles.contenedorFiltroAnual}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Row>
                {calendariosEmpresa.map((cal) => {
                  const centroAsociado = centrosEmpresa.find(
                    (c) => c.id === cal.centro_trabajo_id,
                  );
                  const nombreCentro =
                    centroAsociado?.nombre || "Global Empresa";
                  const displayLabel = cal.nombre
                    ? `${cal.nombre} (${nombreCentro})`
                    : `Año ${cal.anio} (${nombreCentro})`;
                  const estaSeleccionado = calendarioActual?.id === cal.id;

                  return (
                    <Pressable
                      key={cal.id || cal.anio.toString()}
                      style={[
                        styles.chipAno,
                        estaSeleccionado && styles.chipAnoSeleccionado,
                      ]}
                      onPress={() => {
                        setCalendarioActual(cal);
                        setMostrarEdicionCampos(false);
                      }}
                      disabled={guardando}
                    >
                      <ThemedText
                        style={[
                          styles.chipAnoTexto,
                          estaSeleccionado && styles.chipAnoTextoSeleccionado,
                        ]}
                      >
                        {displayLabel}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </Row>
            </ScrollView>
          </View>

          <Row>
            <Pressable
              style={[
                {
                  backgroundColor: "#475569",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                },
                guardando && { opacity: 0.7 },
              ]}
              onPress={() => setMostrarEdicionCampos(!mostrarEdicionCampos)}
              disabled={guardando}
            >
              <ThemedText style={[styles.textoBotonGuardar]}>
                ✏️ {mostrarEdicionCampos ? "Cerrar" : "Cambiar"}
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                {
                  backgroundColor: "#EF4444",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                },
                guardando && { opacity: 0.7 },
              ]}
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

      {calendarioActual && (
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
              <ThemedText style={[styles.subseccionTitulo, { marginTop: 0 }]}>
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
                  editable={!guardando}
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
                  editable={!guardando}
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
                  {centrosEmpresa.map((centro) => {
                    const esEsteCentro = editCentroId === centro.id;
                    return (
                      <Pressable
                        key={centro.id}
                        style={[
                          styles.chipAno,
                          esEsteCentro && { backgroundColor: "#0F172A" },
                        ]}
                        onPress={() => setEditCentroId(centro.id)}
                        disabled={guardando}
                      >
                        <ThemedText
                          style={{
                            fontSize: 11,
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
              </View>

              <Pressable
                style={[
                  styles.botonGuardar,
                  { backgroundColor: "#0F172A", height: 40, marginTop: 5 },
                  guardando && { opacity: 0.7 },
                ]}
                onPress={handleEditarCalendario}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.textoBotonGuardar}>
                    Guardar Cambios del Calendario
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}

          <ThemedText
            style={[
              styles.ayudaTexto,
              { marginTop: 12, alignSelf: "flex-start" },
            ]}
          >
            Presiona sobre cualquier día para asignarlo como Festivo/No
            Laborable.
          </ThemedText>

          <CalendarLaboralAnual
            anio={Number(calendarioActual.anio)}
            festivos={calendarioActual.festivos}
            onDayPress={handleDayPress}
          />
        </View>
      )}
    </View>
  );
}
