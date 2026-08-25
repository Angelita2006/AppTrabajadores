import { ThemedText } from "@/src/shared/components/themed-text";
import { Row } from "@/src/shared/ui/AppSurface";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import React, { useState } from "react";
import { Alert, Platform, Pressable, TextInput, View } from "react-native";
import {
  crearTurno,
  editarTurno,
  eliminarTurno,
} from "../../turnos/api/services";
import { Turno } from "../../turnos/types/turno";

export default function TabTurnos({
  turnosEmpresa,
  setTurnosEmpresa,
  empresaSeleccionada,
  guardando,
  setGuardando,
  styles,
}: any) {
  const [mostrarFormTurno, setMostrarFormTurno] = useState(false);

  const [nombreTurno, setNombreTurno] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [duracionPausa, setDuracionPausa] = useState("0");
  const [turnoEnEdicion, setTurnoEnEdicion] = useState<Turno | null>(null);

  // ==========================================
  // CREACIÓN DE TURNOS
  // ==========================================
  const handleCrearTurno = async () => {
    if (!nombreTurno || !horaInicio || !horaFin || !empresaSeleccionada) {
      if (Platform.OS === "web") {
        alert(
          "Campos de Turno Vacíos: Especifica nombre, hora de inicio y fin (HH:MM:SS).",
        );
      } else {
        Alert.alert(
          "Campos de Turno Vacíos",
          "Especifica nombre, hora de inicio y fin (HH:MM:SS).",
        );
      }
      return;
    }
    try {
      setGuardando(true);
      await crearTurno({
        empresa_id: empresaSeleccionada.id,
        nombre: nombreTurno.trim(),
        hora_inicio: horaInicio.trim(),
        hora_fin: horaFin.trim(),
        duracion_pausa_minutos: parseInt(duracionPausa, 10),
        dias_semana: [1, 2, 3, 4, 5],
      });

      Alert.alert(
        "Turno Guardado",
        `El turno estructural "${nombreTurno}" ha sido guardado.`,
      );
      setNombreTurno("");
      setHoraInicio("");
      setHoraFin("");
      setDuracionPausa("");
      setMostrarFormTurno(false);
      // await cargarDatosEmpresa(empresaSeleccionada.id);
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

  // ==========================================
  // EDICIÓN DE TURNOS
  // ==========================================
  const handleEditarTurno = async (turno: Turno) => {
    try {
      setGuardando(true);
      await editarTurno(turno.id, turno);
      setTurnosEmpresa((prev: Turno[]) =>
        prev.map((t: Turno) => (t.id === turno.id ? turno : t)),
      );
      Alert.alert("Éxito", "Turno actualizado correctamente.");
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

  // ==========================================
  // ELIMINACIÓN DE TURNOS
  // ==========================================
  const handleEliminarTurno = async (
    turnoId: string,
    nombreTurno: string = "este turno",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarTurno(turnoId);
        setTurnosEmpresa((prev: Turno[]) =>
          prev.filter((t: Turno) => t.id !== turnoId),
        );
        Alert.alert("Éxito", "Turno laboral eliminado correctamente.");
      } catch (error: any) {
        const mensajeAmigable = obtenerMensajeAmigableError(error);
        if (Platform.OS === "web") {
          alert(`${mensajeAmigable}`);
        } else {
          Alert.alert(
            mensajeAmigable ||
              `Existen contratos activos vinculados al turno "${nombreTurno}". Debe modificarlos o rescindirlos antes de borrarlo.`,
          );
        }
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmado = window.confirm(
        `¿Estás seguro de eliminar el turno "${nombreTurno}"?`,
      );
      if (confirmado) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        `¿Estás seguro de eliminar el turno "${nombreTurno}"?`,
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
            backgroundColor: mostrarFormTurno ? "#64748B" : "#16A34A",
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
            <ThemedText style={styles.labelInput}>Nombre del Turno</ThemedText>
            <TextInput
              style={styles.inputForm}
              value={nombreTurno}
              onChangeText={setNombreTurno}
            />
          </View>

          <Row>
            <View style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}>
              <ThemedText style={styles.labelInput}>Hora Inicio</ThemedText>
              <TextInput
                style={styles.inputForm}
                value={horaInicio}
                onChangeText={setHoraInicio}
              />
            </View>
            <View style={[styles.campoFormulario, { flex: 1 }]}>
              <ThemedText style={styles.labelInput}>Hora Fin</ThemedText>
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

      {turnosEmpresa.map((turno: Turno) => (
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
                    setDuracionPausa(turno.duracion_pausa_minutos.toString());
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
                <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
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
                  style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}
                >
                  <ThemedText style={styles.labelInput}>Hora Inicio</ThemedText>
                  <TextInput
                    style={styles.inputForm}
                    value={horaInicio}
                    onChangeText={setHoraInicio}
                  />
                </View>
                <View style={[styles.campoFormulario, { flex: 1 }]}>
                  <ThemedText style={styles.labelInput}>Hora Fin</ThemedText>
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
