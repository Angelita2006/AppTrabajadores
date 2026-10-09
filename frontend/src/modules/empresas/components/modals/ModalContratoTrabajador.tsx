import { CalendarioFestivo } from "@/src/modules/calendarios-laborales/types/calendario";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import {
  TIPOS_CONTRATO,
  TIPOS_JORNADA,
} from "@/src/modules/contratos/types/contrato";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import React from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";

/**
 * Propiedades requeridas para el funcionamiento del componente ModalContratoTrabajador.
 */
interface ModalContratoTrabajadorProps {
  esEdicion: boolean;
  trabajadorActual: any;
  tipoContrato: string;
  setTipoContrato: (val: string) => void;
  tipoJornada: string;
  setTipoJornada: (val: string) => void;
  horasSemana: string;
  setHorasSemana: (val: string) => void;
  fechaInicio: string;
  setFechaInicio: (val: string) => void;
  fechaFin: string;
  setFechaFin: (val: string) => void;
  puestoTrabajo: string;
  setPuestoTrabajo: (val: string) => void;
  categoriaProfesional: string;
  setCategoriaProfesional: (val: string) => void;
  centroTrabajoId: string;
  setCentroTrabajoId: (val: string) => void;
  departamentoId: string;
  setDepartamentoId: (val: string) => void;
  calendarioLaboralId: string;
  setCalendarioLaboralId: (val: string) => void;
  listaCentros: CentroTrabajo[];
  listaDepartamentos: Departamento[];
  listaCalendariosLaborales: CalendarioFestivo[];
  onGuardar: () => void;
  onCancelar?: () => void;
  procesando: boolean;
  styles: any;
  inputRefs?: {
    inputHorasSemanaRef?: any;
    inputFechaInicioRef?: any;
    inputFechaFinRef?: any;
    inputPuestoRef?: any;
    inputCategoriaRef?: any;
    botonGuardarContratoRef?: any;
  };
}

export const ModalContratoTrabajador: React.FC<
  ModalContratoTrabajadorProps
> = ({
  esEdicion,
  trabajadorActual,
  tipoContrato,
  setTipoContrato,
  tipoJornada,
  setTipoJornada,
  horasSemana,
  setHorasSemana,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  puestoTrabajo,
  setPuestoTrabajo,
  categoriaProfesional,
  setCategoriaProfesional,
  centroTrabajoId,
  setCentroTrabajoId,
  departamentoId,
  setDepartamentoId,
  calendarioLaboralId,
  setCalendarioLaboralId,
  listaCentros,
  listaDepartamentos,
  listaCalendariosLaborales,
  onGuardar,
  onCancelar,
  procesando,
  styles,
  inputRefs = {},
}) => {
  const { mostrarError, mostrarMensaje } = useAppModal();

  const handleValidarYGuardar = () => {
    if (!trabajadorActual || !trabajadorActual.id) {
      mostrarError(
        "No se ha especificado un trabajador válido para asociar el contrato.",
      );
      return;
    }

    if (!tipoContrato || tipoContrato.trim() === "") {
      mostrarError("Debes seleccionar un tipo de contrato obligatorio.");
      return;
    }

    if (!tipoJornada || tipoJornada.trim() === "") {
      mostrarError("Debes seleccionar un tipo de jornada laboral.");
      return;
    }

    if (horasSemana && horasSemana.trim() !== "") {
      const horasNum = Number(horasSemana);
      if (isNaN(horasNum) || horasNum <= 0 || horasNum > 168) {
        mostrarError(
          "Introduce un número válido de horas semanales (entre 1 y 168).",
        );
        return;
      }
    }

    if (!fechaInicio || fechaInicio.trim() === "") {
      mostrarError("La fecha de inicio del contrato es obligatoria.");
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
          "La fecha de fin no puede ser anterior a la fecha de inicio del contrato.",
        );
        return;
      }
    }

    if (!centroTrabajoId || centroTrabajoId.trim() === "") {
      mostrarError("Debes seleccionar un centro de trabajo obligatorio.");
      return;
    }

    if (!departamentoId || departamentoId.trim() === "") {
      mostrarError(
        "Debes seleccionar un departamento asociado al centro de trabajo.",
      );
      return;
    }

    if (!calendarioLaboralId || calendarioLaboralId.trim() === "") {
      mostrarError(
        "Debes seleccionar un calendario laboral válido para el contrato.",
      );
      return;
    }

    mostrarMensaje(
      "Verificación Exitosa",
      esEdicion
        ? "Actualizando los datos del contrato..."
        : "Formalizando nuevo contrato laboral...",
    );

    onGuardar();
  };

  /** Estilo unificado para los chips interactivos (idéntico al de roles) */
  const getChipStyle = (seleccionado: boolean) => ({
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: seleccionado ? "#2563EB" : "#D1D5DB",
    backgroundColor: seleccionado ? "#EFF6FF" : "#FFFFFF",
  });

  const getChipTextStyle = (seleccionado: boolean) => ({
    color: seleccionado ? "#1D4ED8" : "#374151",
    fontWeight: (seleccionado ? "bold" : "normal") as "bold" | "normal",
    fontSize: 14,
  });

  return (
    <View>
      <ThemedText style={styles.subtituloModal}>
        Trabajador: {trabajadorActual?.nombre} {trabajadorActual?.apellidos}
      </ThemedText>

      {/* Selector de Tipo de Contrato */}
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Tipo de Contrato *</ThemedText>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {Object.values(TIPOS_CONTRATO).map((tipo: string) => {
            const seleccionado = tipoContrato === tipo;
            return (
              <Pressable
                key={tipo}
                style={getChipStyle(seleccionado)}
                onPress={() => setTipoContrato(tipo)}
              >
                <ThemedText style={getChipTextStyle(seleccionado)}>
                  {tipo.replace("_", " ").toUpperCase()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selector de Tipo de Jornada */}
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Tipo Jornada *</ThemedText>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {Object.values(TIPOS_JORNADA).map((jornada: string) => {
            const seleccionado = tipoJornada === jornada;
            return (
              <Pressable
                key={jornada}
                style={getChipStyle(seleccionado)}
                onPress={() => setTipoJornada(jornada)}
              >
                <ThemedText style={getChipTextStyle(seleccionado)}>
                  {jornada.toUpperCase()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Horas por Semana</ThemedText>
        <TextInput
          ref={inputRefs.inputHorasSemanaRef}
          style={styles.inputForm}
          value={horasSemana}
          onChangeText={setHorasSemana}
          keyboardType="numeric"
          returnKeyType="next"
          onSubmitEditing={() =>
            inputRefs.inputFechaInicioRef?.current?.focus()
          }
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>
          Fecha Inicio (AAAA-MM-DD) *
        </ThemedText>
        <TextInput
          ref={inputRefs.inputFechaInicioRef}
          style={styles.inputForm}
          value={fechaInicio}
          onChangeText={setFechaInicio}
          placeholder="Ej: 2026-09-01"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.inputFechaFinRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Fecha Fin (Opcional)</ThemedText>
        <TextInput
          ref={inputRefs.inputFechaFinRef}
          style={styles.inputForm}
          value={fechaFin}
          onChangeText={setFechaFin}
          placeholder="Ej: 2026-09-30"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.inputPuestoRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Puesto de Trabajo</ThemedText>
        <TextInput
          ref={inputRefs.inputPuestoRef}
          style={styles.inputForm}
          value={puestoTrabajo}
          onChangeText={setPuestoTrabajo}
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.inputCategoriaRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Categoría Profesional</ThemedText>
        <TextInput
          ref={inputRefs.inputCategoriaRef}
          style={styles.inputForm}
          value={categoriaProfesional ?? ""}
          onChangeText={setCategoriaProfesional}
          returnKeyType="next"
          onSubmitEditing={() =>
            inputRefs.botonGuardarContratoRef?.current?.focus()
          }
        />
      </View>

      {/* Selector de Centro de Trabajo */}
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Centro de Trabajo *</ThemedText>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {listaCentros.map((centro) => {
            const seleccionado = centroTrabajoId === centro.id;
            return (
              <Pressable
                key={centro.id}
                style={getChipStyle(seleccionado)}
                onPress={() => {
                  setCentroTrabajoId(centro.id);
                  setDepartamentoId("");
                  setCalendarioLaboralId("");
                }}
              >
                <ThemedText style={getChipTextStyle(seleccionado)}>
                  {centro.nombre}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selector de Departamento */}
      {centroTrabajoId ? (
        <View style={styles.campoForm}>
          <ThemedText style={styles.labelForm}>Departamento *</ThemedText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
            }}
          >
            {listaDepartamentos
              .filter(
                (depto: any) => depto.centro_trabajo_id === centroTrabajoId,
              )
              .map((depto: any) => {
                const seleccionado = departamentoId === depto.id;
                return (
                  <Pressable
                    key={depto.id}
                    style={getChipStyle(seleccionado)}
                    onPress={() => setDepartamentoId(depto.id)}
                  >
                    <ThemedText style={getChipTextStyle(seleccionado)}>
                      {depto.nombre}
                    </ThemedText>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ) : null}

      {/* Selector de Calendario Laboral */}
      {centroTrabajoId ? (
        <View style={styles.campoForm}>
          <ThemedText style={styles.labelForm}>Calendario Laboral *</ThemedText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
            }}
          >
            {listaCalendariosLaborales.filter(
              (cal) => cal.centro_trabajo_id === centroTrabajoId,
            ).length === 0 ? (
              <ThemedText
                style={{ color: "#666", fontStyle: "italic", marginBottom: 10 }}
              >
                No hay calendarios asignados a este centro.
              </ThemedText>
            ) : (
              listaCalendariosLaborales
                .filter((cal) => cal.centro_trabajo_id === centroTrabajoId)
                .map((cal) => {
                  const seleccionado = calendarioLaboralId === String(cal.id);
                  return (
                    <Pressable
                      key={cal.id}
                      style={getChipStyle(seleccionado)}
                      onPress={() => setCalendarioLaboralId(String(cal.id))}
                    >
                      <ThemedText style={getChipTextStyle(seleccionado)}>
                        {cal.nombre || `Calendario ${cal.anio}`}
                      </ThemedText>
                    </Pressable>
                  );
                })
            )}
          </View>
        </View>
      ) : (
        <ThemedText
          style={{ color: "#666", fontStyle: "italic", marginBottom: 10 }}
        >
          * Selecciona un centro de trabajo para ver los calendarios laborales
          disponibles.
        </ThemedText>
      )}

      {/* Botonera de Acciones (Guardar y Cancelar con diseño limpio) */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginTop: 15,
          marginBottom: 10,
        }}
      >
        {onCancelar && (
          <Pressable
            style={[
              styles.btnGuardarModal,
              { flex: 1, backgroundColor: "#6B7280" },
            ]}
            onPress={onCancelar}
            disabled={procesando}
          >
            <ThemedText style={styles.btnGuardarModalTexto}>
              Cancelar
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          ref={inputRefs.botonGuardarContratoRef}
          style={[styles.btnGuardarModal, { flex: 1 }]}
          onPress={handleValidarYGuardar}
          disabled={procesando}
          accessible={true}
          accessibilityRole="button"
        >
          {procesando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.btnGuardarModalTexto}>
              {esEdicion ? "Confirmar cambios" : "Formalizar Contrato"}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
};
