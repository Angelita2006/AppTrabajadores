import { ThemedText } from "@/src/shared/components/themed-text";
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
} from "../../tipos_eventos_fichaje/api/services";
import { TipoEventoFichaje } from "../../tipos_eventos_fichaje/types/tipos_evento_fichaje";

export default function TabTipoEventos({
  tiposEventosEmpresa,
  setTiposEventosEmpresa,
  CategoriaEventoEnum,
  CATEGORIA_EVENTO_LABELS,
  guardando,
  setGuardando,
  styles,
}: any) {
  const [mostrarFormTipoEvento, setMostrarFormTipoEvento] = useState(false);
  const [codigoTipoEvento, setCodigoTipoEvento] = useState("");
  const [descripcionTipoEvento, setDescripcionTipoEvento] = useState("");
  const [computaTrabajoTipoEvento, setComputaTrabajoTipoEvento] =
    useState(true);
  const [tipoEventoEnEdicion, setTipoEventoEnEdicion] = useState<any | null>(
    null,
  );

  // ==========================================
  // CREACIÓN DE TIPOS DE EVENTOS
  // ==========================================
  const handleCrearTipoEvento = async () => {
    if (!codigoTipoEvento.trim() || !descripcionTipoEvento.trim()) {
      const msg =
        "Por favor, introduce el código y la descripción del tipo de evento.";
      Platform.OS === "web"
        ? alert(msg)
        : Alert.alert("Campos incompletos", msg);
      return;
    }

    try {
      setGuardando(true);
      const nuevoTipo = await crearTipoEventoFichaje({
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
      Alert.alert("Éxito", "Tipo de evento registrado correctamente.");
    } catch (error: any) {
      const mensajeAmigable =
        error?.message || "Error al registrar el tipo de evento.";
      Platform.OS === "web"
        ? alert(`Error: ${mensajeAmigable}`)
        : Alert.alert("Error", mensajeAmigable);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // EDICIÓN DE TIPOS DE EVENTOS
  // ==========================================
  const handleEditarTipoEvento = async (tipo: any) => {
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
      Alert.alert("Éxito", "Tipo de evento actualizado correctamente.");
    } catch (error: any) {
      const mensajeAmigable =
        error?.message || "Error al actualizar el tipo de evento.";
      Platform.OS === "web"
        ? alert(`Error: ${mensajeAmigable}`)
        : Alert.alert("Error", mensajeAmigable);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE TIPOS DE EVENTOS
  // ==========================================
  const handleEliminarTipoEvento = async (tipoId: string) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarTipoEventoFichaje(tipoId);
        setTiposEventosEmpresa((prev: TipoEventoFichaje[]) =>
          prev.filter((t: TipoEventoFichaje) => t.id !== tipoId),
        );
        Alert.alert("Éxito", "Tipo de evento eliminado correctamente.");
      } catch (error: any) {
        const mensajeAmigable =
          error?.message || "Error al eliminar el tipo de evento.";
        Platform.OS === "web"
          ? alert(`${mensajeAmigable}`)
          : Alert.alert("Error", mensajeAmigable);
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("¿Deseas eliminar este tipo de evento de fichaje?")) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        "¿Deseas eliminar este tipo de evento de fichaje?",
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

  return (
    <View>
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormTipoEvento ? "#64748B" : "#0284C7",
          },
        ]}
        onPress={() => {
          if (!mostrarFormTipoEvento) {
            setCodigoTipoEvento("ENTRADA"); // Valor por defecto
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

      {mostrarFormTipoEvento && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Nuevo Tipo de Evento Personalizado
          </ThemedText>

          {/* SELECTOR DE CATEGORÍA BASE (Enum) */}
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
              {Object.values(CategoriaEventoEnum).map((cat: any) => {
                const seleccionado = codigoTipoEvento === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setCodigoTipoEvento(cat);
                      if (cat === CategoriaEventoEnum.INICIO_PAUSA) {
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
              })}
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

      {tiposEventosEmpresa?.map((tipo: TipoEventoFichaje) => (
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
                <span style={{ fontSize: 10, color: "#64748B" }}>
                  ({tipo.codigo})
                </span>
              </ThemedText>
              <ThemedText style={styles.subtextoElementoLista}>
                {tipo.computa_como_trabajo
                  ? "Computa como trabajo 🟢"
                  : "No computa como trabajo ⚪"}
              </ThemedText>
            </View>

            <View style={{ flexDirection: "row" }}>
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
                  {Object.values(CategoriaEventoEnum).map((cat: any) => {
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
    </View>
  );
}
