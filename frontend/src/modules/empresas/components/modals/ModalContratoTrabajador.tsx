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
import * as DocumentPicker from "expo-document-picker";
import { Turno } from "@/src/modules/turnos/types/turno";

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
  centrosTrabajoIds: string[];
  setCentrosTrabajoIds: (val: string[]) => void;
  departamentoId: string;
  setDepartamentoId: (val: string) => void;
  calendarioLaboralId: string;
  setCalendarioLaboralId: (val: string) => void;
  calendariosSeleccionadosIds: string[];
  setCalendariosSeleccionadosIds: (ids: string[]) => void;
  listaCentros: CentroTrabajo[];
  listaDepartamentos: Departamento[];
  listaCalendariosLaborales: CalendarioFestivo[];
  turnosEmpresa: Turno[];
  turnosSeleccionados: Turno[];
  setTurnosSeleccionados: (turnos: Turno[]) => void;
  archivoContrato: { uri: string; name: string; mimeType?: string | null } | null;
  setArchivoContrato: (archivo: { uri: string; name: string; mimeType?: string | null } | null) => void;
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
  centrosTrabajoIds,
  setCentrosTrabajoIds,
  departamentoId,
  setDepartamentoId,
  calendarioLaboralId,
  setCalendarioLaboralId,
  calendariosSeleccionadosIds,
  setCalendariosSeleccionadosIds,
  listaCentros,
  listaDepartamentos,
  listaCalendariosLaborales,
  turnosEmpresa,
  turnosSeleccionados,
  setTurnosSeleccionados,
  archivoContrato,
  setArchivoContrato,
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

    if (centrosTrabajoIds.length === 0) {
      mostrarError("Selecciona al menos un centro de trabajo para el contrato.");
      return;
    }

    if (turnosSeleccionados.length === 0) {
      mostrarError("Selecciona al menos un turno para formalizar el contrato.");
      return;
    }

    if (!departamentoId || departamentoId.trim() === "") {
      mostrarError(
        "Debes seleccionar el departamento del contrato.",
      );
      return;
    }

    if (calendariosSeleccionadosIds.length === 0 && !calendarioLaboralId) {
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

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Turnos iniciales *</ThemedText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {turnosEmpresa.filter((turno) => turno.activo !== false).map((turno) => {
            const seleccionado = turnosSeleccionados.some((item) => item.id === turno.id);
            return <Pressable key={turno.id} style={getChipStyle(seleccionado)} onPress={() => setTurnosSeleccionados(seleccionado ? turnosSeleccionados.filter((item) => item.id !== turno.id) : [...turnosSeleccionados, turno])}>
              <ThemedText style={getChipTextStyle(seleccionado)}>{turno.nombre} ({turno.dias_semana.map((dia) => ["", "L", "M", "X", "J", "V", "S", "D"][dia]).join(", ")})</ThemedText>
            </Pressable>;
          })}
        </View>
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Documento PDF (opcional)</ThemedText>
        <Pressable style={getChipStyle(Boolean(archivoContrato))} onPress={async () => {
          const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
          if (!resultado.canceled && resultado.assets[0]) setArchivoContrato({ uri: resultado.assets[0].uri, name: resultado.assets[0].name, mimeType: resultado.assets[0].mimeType });
        }}>
          <ThemedText style={getChipTextStyle(Boolean(archivoContrato))}>{archivoContrato?.name ?? "Seleccionar PDF"}</ThemedText>
        </Pressable>
        {archivoContrato ? <Pressable onPress={() => setArchivoContrato(null)}><ThemedText style={{ color: "#B91C1C", marginTop: 6 }}>Quitar documento</ThemedText></Pressable> : null}
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

      {/* Selector múltiple de centros de trabajo */}
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Centros de trabajo asociados *</ThemedText>
        <ThemedText style={{ color: "#64748B", fontSize: 12 }}>Selecciona todos los lugares de prestación, como la sede y el domicilio.</ThemedText>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {listaCentros.map((centro) => {
            const seleccionado = centrosTrabajoIds.includes(centro.id);
            return (
              <Pressable
                key={centro.id}
                style={getChipStyle(seleccionado)}
                onPress={() => {
                  setCentrosTrabajoIds(
                    seleccionado
                      ? centrosTrabajoIds.filter((id) => id !== centro.id)
                      : [...centrosTrabajoIds, centro.id],
                  );
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

      {/* Selector de Calendario Laboral */}
      <View style={styles.campoForm}>
          <ThemedText style={styles.labelForm}>Calendarios Laborales vigentes *</ThemedText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
            }}
          >
            {listaCalendariosLaborales.length === 0 ? (
              <ThemedText
                style={{ color: "#666", fontStyle: "italic", marginBottom: 10 }}
              >
                No hay calendarios configurados para esta empresa.
              </ThemedText>
            ) : (
              listaCalendariosLaborales.map((cal) => {
                  const idCalendario = String(cal.id);
                  const seleccionado = calendariosSeleccionadosIds.includes(idCalendario) || calendarioLaboralId === idCalendario;
                  return (
                    <Pressable
                      key={cal.id}
                      style={getChipStyle(seleccionado)}
                      onPress={() => {
                        const siguiente = seleccionado
                          ? calendariosSeleccionadosIds.filter((id) => id !== idCalendario)
                          : [...calendariosSeleccionadosIds, idCalendario];
                        setCalendariosSeleccionadosIds(siguiente);
                        setCalendarioLaboralId(siguiente[0] ?? "");
                      }}
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
