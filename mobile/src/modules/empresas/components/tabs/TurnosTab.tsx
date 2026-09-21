import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { Row } from "@/src/shared/ui/AppSurface";
import {
  validarDuracionPausa,
  validarFormatoHora,
  validarTextoObligatorio,
} from "@/src/utils/validators";
import React, { useRef, useState } from "react";
import { Alert, Platform, Pressable, TextInput, View } from "react-native";
import {
  crearTurno,
  editarTurno,
  eliminarTurno,
} from "../../../turnos/api/services";
import { TabTurnosProps, Turno } from "../../../turnos/types/turno";

/**
 * Componente de Gestión de Turnos Laborales.
 * Contiene todas las operaciones de interfaz y lógica de negocio para la consulta, registro, actualización y eliminación de turnos de trabajo asociados a una empresa.
 *
 * @component
 * @param {TabTurnosProps} props - Propiedades del componente para la gestión de turnos.
 */
export default function TabTurnos({
  turnosEmpresa,
  setTurnosEmpresa,
  empresaActual,
  guardando,
  setGuardando,
  styles,
}: TabTurnosProps) {
  const [mostrarFormTurno, setMostrarFormTurno] = useState<boolean>(false);
  const [mostrarPapelera, setMostrarPapelera] = useState(false);

  const [nombreTurno, setNombreTurno] = useState<string>("");
  const [horaInicio, setHoraInicio] = useState<string>("");
  const [horaFin, setHoraFin] = useState<string>("");
  const [duracionPausa, setDuracionPausa] = useState<string>("0");
  const [turnoEnEdicion, setTurnoEnEdicion] = useState<Turno | null>(null);

  // ==========================================
  // REFERENCIAS PARA CREACIÓN Y EDICIÓN
  // ==========================================
  const crearHoraInicioRef = useRef<TextInput | null>(null);
  const crearHoraFinRef = useRef<TextInput | null>(null);
  const crearPausaRef = useRef<TextInput | null>(null);

  const editarHoraInicioRef = useRef<TextInput | null>(null);
  const editarHoraFinRef = useRef<TextInput | null>(null);
  const editarPausaRef = useRef<TextInput | null>(null);

  const turnosActivos = turnosEmpresa.filter((turno) => turno.activo !== false);
  const turnosInactivos = turnosEmpresa.filter(
    (turno) => turno.activo === false,
  );
  const { mostrarError, mostrarMensaje } = useAppModal();

  /**
   * Valida de forma integral los campos del formulario de turnos utilizando las funciones de validación.
   * @returns {string | null} Mensaje de error si la validación falla, o null si es correcta.
   */
  const validarCamposTurno = (): string | null => {
    if (!empresaActual) {
      return "No se ha seleccionado ninguna empresa activa.";
    }
    if (!nombreTurno || nombreTurno.trim() === "") {
      return "El nombre del turno es obligatorio.";
    }
    if (!validarTextoObligatorio(nombreTurno, 3)) {
      return "El nombre del turno debe tener al menos 3 caracteres.";
    }
    if (!horaInicio || horaInicio.trim() === "") {
      return "La hora de inicio es obligatoria.";
    }
    if (!validarFormatoHora(horaInicio)) {
      return "El formato de la Hora de Inicio no es válido. Utilice HH:MM o HH:MM:SS.";
    }
    if (!horaFin || horaFin.trim() === "") {
      return "La hora de fin es obligatoria.";
    }
    if (!validarFormatoHora(horaFin)) {
      return "El formato de la Hora Fin no es válido. Utilice HH:MM o HH:MM:SS.";
    }
    if (!validarDuracionPausa(duracionPausa)) {
      return "La duración de la pausa debe ser un valor numérico válido mayor o igual a cero.";
    }
    return null;
  };

  /**
   * Ejecuta la creación de un nuevo turno laboral para la empresa seleccionada.
   * Valida que los campos obligatorios y sus formatos sean correctos antes de enviar la petición a la API.
   *
   * @async
   * @function handleCrearTurno
   * @returns {Promise<void>} Promesa vacía al completar el registro.
   */
  const handleCrearTurno = async () => {
    const errorValidacion = validarCamposTurno();
    if (errorValidacion) {
      mostrarMensaje("Datos incompletos o erróneos", errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      const nuevoTurno = await crearTurno({
        empresa_id: empresaActual!.id,
        nombre: nombreTurno.trim(),
        hora_inicio: horaInicio.trim(),
        hora_fin: horaFin.trim(),
        duracion_pausa_minutos: parseInt(duracionPausa, 10) || 0,
        dias_semana: [1, 2, 3, 4, 5],
      });

      if (nuevoTurno) {
        setTurnosEmpresa((prev) => [...prev, nuevoTurno]);
      }

      mostrarMensaje(
        "Turno Guardado",
        `El turno estructural "${nombreTurno}" ha sido guardado.`,
      );
      setNombreTurno("");
      setHoraInicio("");
      setHoraFin("");
      setDuracionPausa("0");
      setMostrarFormTurno(false);
    } catch (error: any) {
      mostrarError("Error al crear el turno laboral: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Ejecuta la actualización de los datos de un turno existente mediante su identificador,
   * aplicando validaciones previas sobre los campos editados.
   *
   * @async
   * @function handleEditarTurno
   * @param {Turno} turnoActualizado - Objeto con los datos actualizados del turno.
   * @returns {Promise<void>} Promesa vacía al completar la actualización.
   */
  const handleEditarTurno = async (turnoActualizado: Turno) => {
    const errorValidacion = validarCamposTurno();
    if (errorValidacion) {
      mostrarMensaje("Datos incompletos o erróneos", errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      await editarTurno(turnoActualizado.id, turnoActualizado);
      setTurnosEmpresa((prev: Turno[]) =>
        prev.map((t: Turno) =>
          t.id === turnoActualizado.id ? turnoActualizado : t,
        ),
      );
      mostrarMensaje("Éxito", "Turno actualizado correctamente.");
      setTurnoEnEdicion(null);
    } catch (error: any) {
      mostrarError("Error al actualizar el turno laboral: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Controla el flujo de eliminación de un turno laboral por su identificador, mostrando un diálogo de confirmación previo.
   *
   * @async
   * @function handleEliminarTurno
   * @param {string} turnoId - ID único del turno a eliminar.
   * @param {string} [nombreTurnoParam="este turno"] - Nombre descriptivo del turno para los mensajes de alerta.
   * @returns {Promise<void>} Promesa vacía al completar la eliminación.
   */
  const handleEliminarTurno = async (
    turnoId: string,
    nombreTurnoParam: string = "este turno",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarTurno(turnoId);
        setTurnosEmpresa((prev: Turno[]) =>
          prev.map((t: Turno) =>
            t.id === turnoId ? { ...t, activo: false } : t,
          ),
        );
        mostrarMensaje("Éxito", "Turno laboral enviado a la papelera.");
      } catch (error: any) {
        mostrarError(
          `Existen contratos activos vinculados al turno "${nombreTurnoParam}". Debe modificarlos o rescindirlos antes de borrarlo. ` +
            error,
        );
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmado = window.confirm(
        `¿Estás seguro de eliminar el turno "${nombreTurnoParam}"?`,
      );
      if (confirmado) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        `¿Estás seguro de eliminar el turno "${nombreTurnoParam}"?`,
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

  const handleReactivarTurno = async (turnoId: string) => {
    try {
      setGuardando(true);
      await editarTurno(turnoId, { activo: true });
      setTurnosEmpresa((prev) =>
        prev.map((turno) =>
          turno.id === turnoId ? { ...turno, activo: true } : turno,
        ),
      );
      mostrarMensaje("Éxito", "Turno reactivado correctamente.");
    } catch (error: any) {
      mostrarError("Error al reactivar el turno: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View>
      {/* Botón principal para alternar la visibilidad del formulario de creación de turnos */}
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormTurno ? "#64748B" : "#16A34A",
          },
        ]}
        onPress={() => {
          if (!mostrarFormTurno) {
            setNombreTurno("");
            setHoraInicio("");
            setHoraFin("");
            setDuracionPausa("0");
          }
          setMostrarFormTurno(!mostrarFormTurno);
          setTurnoEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormTurno ? "✕ Cancelar" : "＋ Crear Turno"}
        </ThemedText>
      </Pressable>

      {/* Formulario desplegable para la creación de un nuevo turno */}
      {mostrarFormTurno && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Estructurar Horarios y Turnos
          </ThemedText>

          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Nombre del Turno *
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={nombreTurno}
              onChangeText={setNombreTurno}
              placeholder="Ej. Mañana"
              editable={!guardando}
              returnKeyType="next"
              onSubmitEditing={() => crearHoraInicioRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <Row>
            <View style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}>
              <ThemedText style={styles.labelInput}>Hora Inicio *</ThemedText>
              <TextInput
                ref={crearHoraInicioRef}
                style={styles.inputForm}
                value={horaInicio}
                onChangeText={setHoraInicio}
                placeholder="HH:MM:SS"
                editable={!guardando}
                returnKeyType="next"
                onSubmitEditing={() => crearHoraFinRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View style={[styles.campoFormulario, { flex: 1 }]}>
              <ThemedText style={styles.labelInput}>Hora Fin *</ThemedText>
              <TextInput
                ref={crearHoraFinRef}
                style={styles.inputForm}
                value={horaFin}
                onChangeText={setHoraFin}
                placeholder="HH:MM:SS"
                editable={!guardando}
                returnKeyType="next"
                onSubmitEditing={() => crearPausaRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </Row>

          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Duración Pausa (Minutos) *
            </ThemedText>
            <TextInput
              ref={crearPausaRef}
              style={styles.inputForm}
              value={duracionPausa}
              onChangeText={setDuracionPausa}
              keyboardType="numeric"
              editable={!guardando}
              returnKeyType="go"
              onSubmitEditing={handleCrearTurno}
              blurOnSubmit={false}
            />
          </View>

          <Pressable
            style={[styles.botonGuardar, { backgroundColor: "#16A34A" }]}
            onPress={handleCrearTurno}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              Guardar Turno
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>Turnos</ThemedText>

      {/* Listado dinámico de turnos configurados */}
      {turnosActivos.map((turno: Turno) => (
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
              {/* Botón para alternar el modo de edición del turno */}
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
                    setDuracionPausa(turno.duracion_pausa_minutos.toString());
                    setMostrarFormTurno(false);
                  }
                }}
              >
                <ThemedText>✏️</ThemedText>
              </Pressable>
              {/* Botón para eliminar el turno */}
              <Pressable
                style={{
                  backgroundColor: "#fee2e2",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                }}
                onPress={() => handleEliminarTurno(turno.id, turno.nombre)}
              >
                <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
              </Pressable>
            </Row>
          </View>

          {/* Formulario desplegable para la edición del turno seleccionado */}
          {turnoEnEdicion?.id === turno.id && (
            <View style={styles.contenedorFormDesplegado}>
              <ThemedText style={styles.formularioTitulo}>
                Editar Turno
              </ThemedText>

              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>
                  Nombre del Turno *
                </ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={nombreTurno}
                  onChangeText={setNombreTurno}
                  editable={!guardando}
                  returnKeyType="next"
                  onSubmitEditing={() => editarHoraInicioRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Row>
                <View
                  style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}
                >
                  <ThemedText style={styles.labelInput}>
                    Hora Inicio *
                  </ThemedText>
                  <TextInput
                    ref={editarHoraInicioRef}
                    style={styles.inputForm}
                    value={horaInicio}
                    onChangeText={setHoraInicio}
                    editable={!guardando}
                    returnKeyType="next"
                    onSubmitEditing={() => editarHoraFinRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
                <View style={[styles.campoFormulario, { flex: 1 }]}>
                  <ThemedText style={styles.labelInput}>Hora Fin *</ThemedText>
                  <TextInput
                    ref={editarHoraFinRef}
                    style={styles.inputForm}
                    value={horaFin}
                    onChangeText={setHoraFin}
                    editable={!guardando}
                    returnKeyType="next"
                    onSubmitEditing={() => editarPausaRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </Row>

              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>
                  Duración Pausa (Minutos) *
                </ThemedText>
                <TextInput
                  ref={editarPausaRef}
                  style={styles.inputForm}
                  value={duracionPausa}
                  onChangeText={setDuracionPausa}
                  keyboardType="numeric"
                  editable={!guardando}
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    handleEditarTurno({
                      ...turno,
                      nombre: nombreTurno.trim(),
                      hora_inicio: horaInicio.trim(),
                      hora_fin: horaFin.trim(),
                      duracion_pausa_minutos: parseInt(duracionPausa, 10) || 0,
                    });
                  }}
                  blurOnSubmit={false}
                />
              </View>

              <Pressable
                style={[
                  styles.botonGuardar,
                  { backgroundColor: "#16A34A", marginTop: 10 },
                ]}
                onPress={() => {
                  handleEditarTurno({
                    ...turno,
                    nombre: nombreTurno.trim(),
                    hora_inicio: horaInicio.trim(),
                    hora_fin: horaFin.trim(),
                    duracion_pausa_minutos: parseInt(duracionPausa, 10) || 0,
                  });
                }}
                disabled={guardando}
              >
                <ThemedText style={styles.textoBotonGuardar}>
                  Actualizar Cambios
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setTurnoEnEdicion(null)}
                style={{ marginTop: 15 }}
              >
                <ThemedText style={{ textAlign: "center", color: "#64748B" }}>
                  Cancelar
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {turnosInactivos.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Pressable
            style={[styles.botonAccionHeader, { backgroundColor: "#64748B" }]}
            onPress={() => setMostrarPapelera(!mostrarPapelera)}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              {mostrarPapelera
                ? "📂 Ocultar Papelera"
                : `🗑 Ver Papelera (${turnosInactivos.length})`}
            </ThemedText>
          </Pressable>
          {mostrarPapelera &&
            turnosInactivos.map((turno) => (
              <View key={turno.id} style={styles.itemListaEstructural}>
                <ThemedText style={styles.nombreElementoLista}>
                  {turno.nombre.toUpperCase()}
                </ThemedText>
                <Pressable
                  style={[styles.botonGuardar, { backgroundColor: "#16A34A" }]}
                  onPress={() => handleReactivarTurno(turno.id)}
                  disabled={guardando}
                >
                  <ThemedText style={styles.textoBotonGuardar}>
                    ↻ Reactivar
                  </ThemedText>
                </Pressable>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
