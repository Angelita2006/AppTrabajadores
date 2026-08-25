import { CalendarLaboralAnual } from "@/src/shared/components/calendar";
import { ThemedText } from "@/src/shared/components/themed-text";
import { Row } from "@/src/shared/ui/AppSurface";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
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
  crearCalendarioLaboral,
  eliminarCalendarioLaboral,
  importarCalendarioPDF,
  modificarCalendarioLaboral,
} from "../../calendarios-laborales/api/services";
import {
  CalendarioFestivo,
  CalendarioLaboralCreate,
  CalendarioLaboralResponse,
  CalendarioLaboralUpdate,
} from "../../calendarios-laborales/types/calendario";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { crearFestivo, editarFestivo } from "../../festivos/api/services";
import { Festivo } from "../../festivos/types/festivo";

export default function TabCalendario({
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
}: any) {
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

  useEffect(() => {
    if (centrosEmpresa && centrosEmpresa.length > 0) {
      setCentroNuevoCalendario(centrosEmpresa[0].id);
    } else {
      setCentroNuevoCalendario("");
    }
  }, [centrosEmpresa]);

  const tieneCentrosValidos = centrosEmpresa && centrosEmpresa.length > 0;

  // Al cambiar el calendario activo, precargamos sus valores de edición
  useEffect(() => {
    if (calendarioSeleccionado) {
      setEditAnio(String(calendarioSeleccionado.anio));
      setEditNombre(calendarioSeleccionado.nombre || "");
      setEditCentroId(calendarioSeleccionado.centro_trabajo_id || null);
    }
  }, [calendarioSeleccionado]);

  const handleCrearCalendario = async () => {
    if (!centrosEmpresa || centrosEmpresa.length === 0) {
      if (Platform.OS === "web") {
        alert(
          "Acción Bloqueada: No se puede crear un calendario si la empresa no tiene centros de trabajo.",
        );
      } else {
        Alert.alert(
          "Acción Bloqueada",
          "No se puede crear un calendario si la empresa no tiene centros de trabajo.",
        );
      }
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
      if (Platform.OS === "web") {
        alert("Error: Introduce un año válido entre 2020 y 2100.");
      } else {
        Alert.alert("Error", "Introduce un año válido entre 2020 y 2100.");
      }
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

      const actualizados = [...calendariosEmpresa, nuevoCalendarioUI];
      setCalendariosEmpresa(actualizados);
      setCalendarioSeleccionado(nuevoCalendarioUI);

      setAnoNuevoCalendario("");
      setNombreNuevoCalendario("");
      if (centrosEmpresa.length > 0) {
        setCentroNuevoCalendario(centrosEmpresa[0].id);
      }

      Alert.alert(
        "Éxito",
        `Calendario "${nuevoCalendarioUI.nombre}" registrado en la BD.`,
      );
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      console.error(error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarCalendario = async () => {
    if (!calendarioSeleccionado || !calendarioSeleccionado.id) return;
    const anioNum = parseInt(editAnio, 10);

    if (!anioNum || isNaN(anioNum) || anioNum < 2020 || anioNum > 2100) {
      if (Platform.OS === "web") {
        alert("Error: Por favor, introduce un año válido (2020-2100).");
      } else {
        Alert.alert("Error", "Por favor, introduce un año válido (2020-2100).");
      }
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
      const actualizados: CalendarioFestivo[] = calendariosEmpresa.map(
        (c: CalendarioFestivo) => {
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
        },
      );

      setCalendariosEmpresa(actualizados);

      // Sincronizamos el objeto seleccionado actual para que cambie el formulario al instante
      setCalendarioSeleccionado({
        ...calendarioSeleccionado,
        anio: respuestaBackend.anio,
        nombre: respuestaBackend.nombre,
        centro_trabajo_id: respuestaBackend.centro_trabajo_id ?? "",
      });

      setMostrarEdicionCampos(false);
      Alert.alert("Éxito", "Calendario laboral actualizado de forma correcta.");
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      console.error("Error al modificar calendario:", error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE CALENDARIOS
  // ==========================================
  const handleEliminarCalendario = async () => {
    const ejecutarEliminacion = async () => {
      if (!calendarioSeleccionado || !calendarioSeleccionado.id) return;
      try {
        setGuardando(true);

        if (!calendarioSeleccionado.id) return;

        await eliminarCalendarioLaboral(calendarioSeleccionado.id);

        // Removemos el elemento eliminado del estado local de React
        const restantes = calendariosEmpresa.filter(
          (c: CalendarioFestivo) => c.id !== calendarioSeleccionado.id,
        );
        setCalendariosEmpresa(restantes);

        // Limpiamos la selección actual para restablecer la UI
        if (restantes.length > 0) {
          setCalendarioSeleccionado(restantes[0]);
        } else {
          setCalendarioSeleccionado(null);
        }

        setMostrarEdicionCampos(false);
        Alert.alert("Éxito", "Calendario laboral eliminado correctamente.");
      } catch (error: any) {
        const mensajeAmigable = obtenerMensajeAmigableError(error);
        if (Platform.OS === "web") {
          alert(`${mensajeAmigable}`);
        } else {
          Alert.alert(mensajeAmigable);
        }
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmado = window.confirm(
        "¿Estás seguro de que deseas eliminar por completo este calendario laboral y todos sus días festivos asociados?",
      );
      if (confirmado) {
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
            onPress: async () => {
              ejecutarEliminacion();
            },
          },
        ],
      );
    }
  };

  const handleDayPress = (fechaStr: string, festivoExistente?: Festivo) => {
    setDiaSeleccionadoCtx(fechaStr);
    setNuevaDescFestivo(festivoExistente?.descripcion || "");
    setNuevoTipoFestivo(festivoExistente?.tipo || "");
    setModalVisible(true);
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
        (f: Festivo) => f.fecha === diaSeleccionadoCtx,
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
      const calendariosActualizados: CalendarioFestivo[] =
        calendariosEmpresa.map((cal: CalendarioFestivo) => {
          if (cal.id === calendarioSeleccionado.id) {
            const existeFestivoLocal = cal.festivos.some(
              (f) => f.fecha === diaSeleccionadoCtx,
            );

            // Actualizamos usando una aserción de tipos para evitar problemas si la interfaz externa no lleva tilde
            const nuevosFestivos = existeFestivoLocal
              ? cal.festivos.map((f: Festivo) =>
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

      setCalendariosEmpresa(calendariosActualizados);

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
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error de Sincronización: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error de Sincronización", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleImportarCalendarioPDF = async () => {
    if (!calendarioSeleccionado || !calendarioSeleccionado.id) {
      if (Platform.OS === "web") {
        alert(
          "Aviso: Primero debes seleccionar un calendario laboral para poder importarle los festivos.",
        );
      } else {
        Alert.alert(
          "Aviso",
          "Primero debes seleccionar un calendario laboral para poder importarle los festivos.",
        );
      }
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

      // 3. Invocación al servicio
      const datosRespuesta = await importarCalendarioPDF(
        calendarioSeleccionado.id,
        formData,
      );

      // 4. Sincronización del estado local de React
      const festivosNuevos = datosRespuesta.festivos;

      const calendariosActualizados: CalendarioFestivo[] =
        calendariosEmpresa.map((cal: CalendarioFestivo) => {
          if (cal.id === calendarioSeleccionado.id) {
            const objetoActualizado = {
              ...cal,
              festivos: [...(cal.festivos || []), ...festivosNuevos],
            };
            setCalendarioSeleccionado(objetoActualizado);
            return objetoActualizado;
          }
          return cal;
        });

      setCalendariosEmpresa(calendariosActualizados);

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
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error de Importación: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error de Importación", mensajeAmigable);
      }
    } finally {
      setImportandoPdf(false);
    }
  };

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
            importandoPdf && { opacity: 0.6 },
          ]}
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
              la pestaña 'Centros de Trabajo' para añadir al menos uno antes de
              continuar.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14, marginTop: 4 }}
          >
            {centrosEmpresa.map((centro: CentroTrabajo) => {
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
                backgroundColor: !tieneCentrosValidos ? "#94A3B8" : "#2563EB",
              },
            ]}
            onPress={handleCrearCalendario}
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

      {calendariosEmpresa.length > 0 ? (
        <View>
          {/* Contenedor horizontal para scroll de los chips */}
          <View style={styles.contenedorFiltroAnual}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Row>
                {calendariosEmpresa.map((cal: CalendarioFestivo) => {
                  const idDelCentro = cal.centro_trabajo_id;
                  const centroAsociado = centrosEmpresa.find(
                    (c: CentroTrabajo) => c.id === idDelCentro,
                  );
                  const nombreCentro = centroAsociado?.nombre
                    ? centroAsociado.nombre
                    : "Global Empresa";

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
                        estaSeleccionado && styles.chipAnoSeleccionado,
                      ]}
                      onPress={() => {
                        setCalendarioSeleccionado(cal);
                        setMostrarEdicionCampos(false);
                      }}
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
                  {centrosEmpresa.map((centro: CentroTrabajo) => {
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
                  {
                    backgroundColor: "#0F172A",
                    height: 40,
                    marginTop: 5,
                  },
                ]}
                onPress={handleEditarCalendario}
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
            Presiona sobre cualquier día para asignarlo como Festivo/No
            Laborable.
          </ThemedText>

          <CalendarLaboralAnual
            year={Number(calendarioSeleccionado.anio)}
            festivos={calendarioSeleccionado.festivos}
            onDayPress={handleDayPress}
          />
        </View>
      )}
    </View>
  );
}
