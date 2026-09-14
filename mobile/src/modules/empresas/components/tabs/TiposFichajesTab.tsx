import { useSesion } from "@/src/modules/usuarios/store/SesionContext";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Switch,
  TextInput,
  View,
} from "react-native";
import {
  actualizarTipoEventoFichaje,
  crearTipoEventoFichaje,
  eliminarTipoEventoFichaje,
} from "../../../tipos_eventos_fichaje/api/services";
import {
  CATEGORIA_EVENTO_LABELS,
  CategoriaEventoEnum,
  CATEGORIAS_EVENTO,
  TipoEventoFichaje,
} from "../../../tipos_eventos_fichaje/types/tipos_evento_fichaje";

/**
 * Propiedades requeridas por el componente TabTipoEventos.
 */
interface TabTipoEventosProps {
  /** Listado de tipos de eventos de fichaje configurados para la empresa. */
  tiposEventosEmpresa: TipoEventoFichaje[];
  /** Función para actualizar el estado del listado de tipos de eventos. */
  setTiposEventosEmpresa: React.Dispatch<
    React.SetStateAction<TipoEventoFichaje[]>
  >;
  /** Estado booleano que indica si se está ejecutando una operación de guardado/carga. */
  guardando: boolean;
  /** Función para actualizar el estado de guardado. */
  setGuardando: (guardando: boolean) => void;
  /** Objeto de estilos personalizados de la aplicación. */
  styles: any;
}

/**
 * Componente que gestiona la pestaña de tipos de eventos de fichaje de una empresa,
 * permitiendo listar, crear, editar, eliminar y gestionar la papelera de eventos inactivos.
 *
 * @component
 * @param {TabTipoEventosProps} props - Propiedades del componente.
 */
export default function TabTipoEventos({
  tiposEventosEmpresa,
  setTiposEventosEmpresa,
  guardando,
  setGuardando,
  styles,
}: TabTipoEventosProps) {
  const { empresaActual } = useSesion();
  const [mostrarFormTipoEvento, setMostrarFormTipoEvento] =
    useState<boolean>(false);
  const [mostrarPapelera, setMostrarPapelera] = useState<boolean>(false);
  const [codigoTipoEvento, setCodigoTipoEvento] = useState<string>("");
  const [descripcionTipoEvento, setDescripcionTipoEvento] =
    useState<string>("");
  const [computaTrabajoTipoEvento, setComputaTrabajoTipoEvento] =
    useState<boolean>(true);
  const [tipoEventoEnEdicion, setTipoEventoEnEdicion] =
    useState<TipoEventoFichaje | null>(null);

  // Separación de eventos activos e inactivos (Papelera)
  // Asumimos que un evento inactivo tiene activo === false o un indicador equivalente.
  const eventosActivos = tiposEventosEmpresa.filter(
    (t: any) => t.activo !== false,
  );
  const eventosInactivos = tiposEventosEmpresa.filter(
    (t: any) => t.activo === false,
  );

  /**
   * Valida de forma integral los campos del formulario de tipos de eventos de fichaje.
   * @returns {string | null} Mensaje de error si la validación falla, o null si es correcta.
   */
  const validarCamposTipoEvento = (): string | null => {
    if (!empresaActual) {
      return "No se ha seleccionado ninguna empresa activa.";
    }
    if (!codigoTipoEvento || codigoTipoEvento.trim() === "") {
      return "El código o tipo base del sistema es obligatorio.";
    }
    const valoresValidos = Object.values(CATEGORIAS_EVENTO) as string[];
    if (!valoresValidos.includes(codigoTipoEvento.trim())) {
      return "El tipo base seleccionado não es válido.";
    }
    if (!descripcionTipoEvento || descripcionTipoEvento.trim() === "") {
      return "La descripción personalizada es obligatoria.";
    }
    if (descripcionTipoEvento.trim().length < 3) {
      return "La descripción personalizada debe tener al menos 3 caracteres.";
    }
    return null;
  };

  /**
   * Ejecuta la creación de un nuevo tipo de evento de fichaje para la empresa actual.
   */
  const handleCrearTipoEvento = async () => {
    const errorValidacion = validarCamposTipoEvento();
    if (errorValidacion) {
      mostrarMensaje("Datos incompletos o erróneos", errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      const nuevoTipo = await crearTipoEventoFichaje({
        empresa_id: empresaActual!.id,
        codigo: codigoTipoEvento.trim().toUpperCase(),
        descripcion: descripcionTipoEvento.trim(),
        computa_como_trabajo: computaTrabajoTipoEvento,
      });

      setTiposEventosEmpresa((prev: TipoEventoFichaje[]) => [
        ...prev,
        nuevoTipo,
      ]);
      setCodigoTipoEvento("");
      setDescripcionTipoEvento("");
      setComputaTrabajoTipoEvento(true);
      setMostrarFormTipoEvento(false);
      mostrarMensaje("Éxito", "Tipo de evento registrado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al crear el tipo de evento de fichaje: " + error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Ejecuta la actualización de los datos de un tipo de evento existente.
   * @param {TipoEventoFichaje} tipo - Objeto con los datos del tipo de evento a editar.
   */
  const handleEditarTipoEvento = async (tipo: TipoEventoFichaje) => {
    const errorValidacion = validarCamposTipoEvento();
    if (errorValidacion) {
      mostrarMensaje("Datos incompletos o erróneos", errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      await actualizarTipoEventoFichaje(tipo.id, {
        codigo: codigoTipoEvento.trim().toUpperCase(),
        descripcion: descripcionTipoEvento.trim(),
        computa_como_trabajo: computaTrabajoTipoEvento,
      });

      setTiposEventosEmpresa((prev: TipoEventoFichaje[]) =>
        prev.map((t: TipoEventoFichaje) =>
          t.id === tipo.id
            ? {
                ...t,
                codigo: codigoTipoEvento.trim().toUpperCase(),
                descripcion: descripcionTipoEvento.trim(),
                computa_como_trabajo: computaTrabajoTipoEvento,
              }
            : t,
        ),
      );

      setTipoEventoEnEdicion(null);
      mostrarMensaje("Éxito", "Tipo de evento actualizado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al actualizar el tipo de evento de fichaje: " + error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Controla el flujo de eliminación de un tipo de evento de fichaje por su identificador.
   * @param {string} tipoId - ID único del tipo de evento a eliminar.
   */
  const handleEliminarTipoEvento = async (tipoId: string) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarTipoEventoFichaje(tipoId);
        // Dependiendo de si la API elimina o marca como inactivo, actualizamos el estado:
        // Si es un borrado lógico, marcamos activo: false. Si es físico, filtramos fuera.
        // Aquí asumiremos marcado como inactivo para que aparezca en la papelera, o filtrado si se borra por completo.
        setTiposEventosEmpresa((prev: TipoEventoFichaje[]) =>
          prev.map((t: any) => (t.id === tipoId ? { ...t, activo: false } : t)),
        );
        mostrarMensaje(
          "Éxito",
          "Tipo de evento enviado a la papelera correctamente.",
        );
      } catch (error: any) {
        mostrarError(
          "Error al eliminar el tipo de evento de fichaje: " + error.message,
        );
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("¿Deseas enviar este tipo de evento a la papelera?")) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        "¿Deseas enviar este tipo de evento a la papelera?",
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
   * Reactiva un tipo de evento previamente inactivo desde la papelera.
   * @param {string} tipoId - ID único del tipo de evento a reactivar.
   */
  const handleReactivarTipoEvento = async (tipoId: string) => {
    try {
      setGuardando(true);
      await actualizarTipoEventoFichaje(tipoId, { activo: true });

      setTiposEventosEmpresa((prev: TipoEventoFichaje[]) =>
        prev.map((t: any) => (t.id === tipoId ? { ...t, activo: true } : t)),
      );
      mostrarMensaje("Éxito", "Tipo de evento reactivado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al reactivar el tipo de evento de fichaje: " + error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View>
      {/* Botón principal para alternar la visibilidad del formulario de creación */}
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormTipoEvento ? "#64748B" : "#0284C7",
          },
        ]}
        onPress={() => {
          if (!mostrarFormTipoEvento) {
            setCodigoTipoEvento(CATEGORIAS_EVENTO.ENTRADA);
            setDescripcionTipoEvento("");
            setComputaTrabajoTipoEvento(true);
          }
          setMostrarFormTipoEvento(!mostrarFormTipoEvento);
          setTipoEventoEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormTipoEvento ? "✕ Cancelar" : "＋ Crear Tipo de Evento"}
        </ThemedText>
      </Pressable>

      {/* Formulario desplegable para la creación de un nuevo tipo de evento */}
      {mostrarFormTipoEvento && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Nuevo Tipo de Evento Personalizado
          </ThemedText>

          {/* Selector de categoría base (Constante) */}
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Tipo Base del Sistema *
            </ThemedText>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 5,
              }}
            >
              {(Object.values(CATEGORIAS_EVENTO) as CategoriaEventoEnum[]).map(
                (cat: CategoriaEventoEnum) => {
                  const seleccionado = codigoTipoEvento === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        setCodigoTipoEvento(cat);
                        if (cat === CATEGORIAS_EVENTO.INICIO_PAUSA) {
                          setComputaTrabajoTipoEvento(false);
                        }
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: seleccionado ? "#0284C7" : "#CBD5E1",
                        backgroundColor: seleccionado ? "#E0F2FE" : "#F8FAFC",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          color: seleccionado ? "#0369A1" : "#334155",
                          fontWeight: seleccionado ? "bold" : "normal",
                        }}
                      >
                        {CATEGORIA_EVENTO_LABELS[cat]}
                      </ThemedText>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Descripción Personalizada *
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={descripcionTipoEvento}
              onChangeText={setDescripcionTipoEvento}
              placeholder="Ej. Fichaje de Entrada Principal"
            />
          </View>

          <View
            style={[
              styles.campoFormulario,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <ThemedText style={styles.labelInput}>
              ¿Computa como trabajo efectivo?
            </ThemedText>
            <Switch
              value={computaTrabajoTipoEvento}
              onValueChange={setComputaTrabajoTipoEvento}
              trackColor={{ false: "#767577", true: "#0284C7" }}
            />
          </View>

          <Pressable
            style={[styles.botonGuardar, { backgroundColor: "#0284C7" }]}
            onPress={handleCrearTipoEvento}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              Guardar Tipo de Evento
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>
        Tipos de Eventos Permitidos
      </ThemedText>

      {/* Listado dinámico de tipos de eventos activos configurados */}
      {eventosActivos?.map((tipo: TipoEventoFichaje) => (
        <View key={tipo.id}>
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
                {tipo.descripcion}{" "}
                <ThemedText style={{ fontSize: 10, color: "#64748B" }}>
                  ({tipo.codigo.replace("_", " ").toUpperCase()})
                </ThemedText>
              </ThemedText>
              <ThemedText style={styles.subtextoElementoLista}>
                {tipo.computa_como_trabajo
                  ? "Computa como trabajo 🟢"
                  : "No computa como trabajo ⚪"}
              </ThemedText>
            </View>

            <View style={{ flexDirection: "row" }}>
              {/* Botón para alternar el modo de edición del tipo de evento */}
              <Pressable
                style={{
                  backgroundColor: "#475569",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                }}
                onPress={() => {
                  if (tipoEventoEnEdicion?.id === tipo.id) {
                    setTipoEventoEnEdicion(null);
                  } else {
                    setTipoEventoEnEdicion(tipo);
                    setCodigoTipoEvento(tipo.codigo);
                    setDescripcionTipoEvento(tipo.descripcion);
                    setComputaTrabajoTipoEvento(
                      tipo.computa_como_trabajo ?? true,
                    );
                    setMostrarFormTipoEvento(false);
                  }
                }}
              >
                <ThemedText>✏️</ThemedText>
              </Pressable>
              {/* Botón para eliminar el tipo de evento */}
              <Pressable
                style={{
                  backgroundColor: "#fee2e2",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                }}
                onPress={() => handleEliminarTipoEvento(tipo.id)}
              >
                <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Formulario desplegable para la edición del tipo de evento seleccionado */}
          {tipoEventoEnEdicion?.id === tipo.id && (
            <View style={styles.contenedorFormDesplegado}>
              <ThemedText style={styles.formularioTitulo}>
                Editar Tipo de Evento
              </ThemedText>

              {/* Selector en edición */}
              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>
                  Tipo Base del Sistema
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 5,
                  }}
                >
                  {(
                    Object.values(CATEGORIAS_EVENTO) as CategoriaEventoEnum[]
                  ).map((cat: CategoriaEventoEnum) => {
                    const seleccionado = codigoTipoEvento === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCodigoTipoEvento(cat)}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: seleccionado ? "#0284C7" : "#CBD5E1",
                          backgroundColor: seleccionado ? "#E0F2FE" : "#F8FAFC",
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 11,
                            color: seleccionado ? "#0369A1" : "#334155",
                          }}
                        >
                          {CATEGORIA_EVENTO_LABELS[cat]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>Descripción</ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={descripcionTipoEvento}
                  onChangeText={setDescripcionTipoEvento}
                />
              </View>

              <View
                style={[
                  styles.campoFormulario,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <ThemedText style={styles.labelInput}>
                  ¿Computa como trabajo efectivo?
                </ThemedText>
                <Switch
                  value={computaTrabajoTipoEvento}
                  onValueChange={setComputaTrabajoTipoEvento}
                  trackColor={{ false: "#767577", true: "#0284C7" }}
                />
              </View>

              <Pressable
                style={[
                  styles.botonGuardar,
                  { backgroundColor: "#0284C7", marginTop: 10 },
                ]}
                onPress={() => handleEditarTipoEvento(tipo)}
                disabled={guardando}
              >
                <ThemedText style={styles.textoBotonGuardar}>
                  Actualizar Cambios
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setTipoEventoEnEdicion(null)}
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

      {/* Apartado de Papelera (Eventos inactivos) */}
      {eventosInactivos.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Pressable
            style={[
              styles.botonAccionHeader,
              { backgroundColor: "#334155", marginTop: 10 },
            ]}
            onPress={() => setMostrarPapelera(!mostrarPapelera)}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              {mostrarPapelera
                ? "📂 Ocultar Papelera"
                : `🗑 Ver Papelera (${eventosInactivos.length})`}
            </ThemedText>
          </Pressable>

          {mostrarPapelera && (
            <View style={{ marginTop: 10 }}>
              <ThemedText style={styles.subseccionTitulo}>
                Papelera - Tipos de Eventos Inactivos
              </ThemedText>
              {eventosInactivos.map((tipoInactivo: TipoEventoFichaje) => (
                <View
                  key={tipoInactivo.id}
                  style={[
                    styles.itemListaEstructural,
                    {
                      marginBottom: 10,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#F1F5F9",
                      opacity: 0.8,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={[styles.nombreElementoLista, { color: "#64748B" }]}
                    >
                      {tipoInactivo.descripcion}{" "}
                      <ThemedText style={{ fontSize: 10, color: "#94A3B8" }}>
                        ({tipoInactivo.codigo.replace("_", " ").toUpperCase()})
                      </ThemedText>
                    </ThemedText>
                    <ThemedText style={styles.subtextoElementoLista}>
                      Inactivo ⚠️
                    </ThemedText>
                  </View>

                  <View style={{ flexDirection: "row" }}>
                    {/* Botón para reactivar */}
                    <Pressable
                      style={{
                        backgroundColor: "#dcfce7",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 16,
                      }}
                      onPress={() => handleReactivarTipoEvento(tipoInactivo.id)}
                      disabled={guardando}
                    >
                      <ThemedText style={{ color: "#16a34a" }}>
                        ♻️ Reactivar
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
