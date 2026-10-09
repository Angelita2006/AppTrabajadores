import { Turno } from "@/src/modules/turnos/types/turno";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

interface ModalAsignarTurnoTrabajadorProps {
  modalActivo: string;
  fechaInicio: string;
  setFechaInicio: (val: string) => void;
  fechaFin: string;
  setFechaFin: (val: string) => void;
  turnosEmpresa: Turno[];
  turnosSeleccionados: Turno[];
  setTurnosSeleccionados: (turnos: Turno[]) => void;
  turnosInicialesVigentes?: Turno[];
  onGuardar: (turnosADesactivar?: { id: string; fechaFin: string }[]) => void;
  onCancelar: () => void;
  procesando: boolean;
  styles: any;
  inputRefs?: {
    inputTurnoInicioRef?: any;
    inputTurnoFinRef?: any;
    botonActualizarRef?: any;
  };
}

export const ModalAsignarTurnoTrabajador: React.FC<
  ModalAsignarTurnoTrabajadorProps
> = ({
  modalActivo,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  turnosEmpresa,
  turnosSeleccionados,
  setTurnosSeleccionados,
  turnosInicialesVigentes = [],
  onGuardar,
  onCancelar,
  procesando,
  styles,
  inputRefs = {},
}) => {
  const { mostrarError, mostrarMensaje } = useAppModal();

  const handleValidarYGuardar = () => {
    if (!fechaInicio || fechaInicio.trim() === "") {
      mostrarError("La fecha de inicio de la asignación es obligatoria.");
      return;
    }

    const regexFecha = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regexFecha.test(fechaInicio.trim())) {
      mostrarError(
        "El formato de la fecha de inicio no es válido. Utiliza el formato AAAA-MM-DD.",
      );
      return;
    }

    if (fechaFin && fechaFin.trim() !== "") {
      if (!regexFecha.test(fechaFin.trim())) {
        mostrarError(
          "El formato de la fecha de fin no es válido. Utiliza el formato AAAA-MM-DD.",
        );
        return;
      }

      const dInicio = new Date(fechaInicio.trim());
      const dFin = new Date(fechaFin.trim());
      if (dFin < dInicio) {
        mostrarError(
          "La fecha de fin no puede ser anterior a la fecha de inicio.",
        );
        return;
      }
    }

    if (!turnosSeleccionados || turnosSeleccionados.length === 0) {
      mostrarError("Debes seleccionar al menos un turno para la asignación.");
      return;
    }

    // Calcular la fecha de ayer en formato AAAA-MM-DD
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyerStr = ayer.toISOString().split("T")[0];

    // Si es reasignación, detectamos los que estaban vigentes pero ya no están seleccionados
    let turnosADesactivar: { id: string; fechaFin: string }[] = [];
    if (modalActivo === "reasignar_turno") {
      turnosADesactivar = turnosInicialesVigentes
        .filter(
          (inicial) => !turnosSeleccionados.some((s) => s.id === inicial.id),
        )
        .map((t) => ({
          id: t.id,
          fechaFin: fechaAyerStr,
        }));
    }

    mostrarMensaje(
      "Procesando Asignación",
      modalActivo === "reasignar_turno"
        ? "Actualizando los turnos asignados..."
        : "Registrando nueva asignación de turnos...",
    );

    // Pasamos los turnos a desactivar a la función de guardado
    onGuardar(turnosADesactivar);
  };

  return (
    <View style={styles.contenedorModal}>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.labelForm}>Inicio *</ThemedText>
          <TextInput
            ref={inputRefs.inputTurnoInicioRef}
            style={styles.inputForm}
            placeholder="AAAA-MM-DD"
            value={fechaInicio}
            onChangeText={setFechaInicio}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.inputTurnoFinRef?.current?.focus()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.labelForm}>Fin (Opcional)</ThemedText>
          <TextInput
            ref={inputRefs.inputTurnoFinRef}
            style={styles.inputForm}
            placeholder="AAAA-MM-DD"
            value={fechaFin || ""}
            onChangeText={setFechaFin}
            returnKeyType="next"
            onSubmitEditing={() =>
              inputRefs.botonActualizarRef?.current?.focus()
            }
          />
        </View>
      </View>

      {/* --- SECCIÓN SELECCIÓN DE TURNOS --- */}
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>
          {modalActivo === "reasignar_turno"
            ? "Seleccione los Turnos *"
            : "Turnos de la Empresa *"}
        </ThemedText>

        <View style={styles.contenedorSelectorScroll}>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled={true}>
            {turnosEmpresa
              .filter((turno) => turno.activo === true)
              .map((turno: Turno) => {
                const estaSeleccionado = turnosSeleccionados.some(
                  (t) => t.id === turno.id,
                );
                return (
                  <Pressable
                    key={turno.id}
                    style={[
                      styles.opcionSelector,
                      estaSeleccionado && styles.opcionSelectorSeleccionada,
                    ]}
                    onPress={() => {
                      setTurnosSeleccionados(
                        estaSeleccionado
                          ? turnosSeleccionados.filter((t) => t.id !== turno.id)
                          : [...turnosSeleccionados, turno],
                      );
                    }}
                  >
                    <ThemedText style={{ color: "#222222" }}>
                      {turno.nombre}
                    </ThemedText>
                    {estaSeleccionado && (
                      <FontAwesome5
                        name="check-square"
                        size={16}
                        color="#2563EB"
                      />
                    )}
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
      </View>

      {/* --- BOTONES DE ACCIÓN --- */}
      <View style={styles.contenedorAccionesModal}>
        <Pressable
          ref={inputRefs.botonActualizarRef}
          style={[
            styles.btnGuardarModal,
            {
              backgroundColor:
                modalActivo === "reasignar_turno" ? "#D946EF" : "#2563EB",
            },
            (procesando ||
              turnosSeleccionados.length === 0 ||
              !fechaInicio) && {
              opacity: 0.5,
            },
          ]}
          onPress={handleValidarYGuardar}
          disabled={
            procesando || turnosSeleccionados.length === 0 || !fechaInicio
          }
          accessible={true}
          accessibilityRole="button"
        >
          {procesando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.btnGuardarModalTexto}>
              {modalActivo === "reasignar_turno" ? "Actualizar" : "Asignar"}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
};
