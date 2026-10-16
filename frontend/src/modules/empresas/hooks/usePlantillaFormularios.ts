import { eliminarTodasAsignacionesTrabajador } from "@/src/modules/asignaciones-turno/api/services";
import { crearContrato, subirDocumentoContrato } from "@/src/modules/contratos/api/services";
import { crearContratoCalendario } from "@/src/modules/contratos-calendarios/api/services";
import { asignarTurnosTrabajador } from "@/src/modules/asignaciones-turno/api/services";
import { Contrato } from "@/src/modules/contratos/types/contrato";
import {
    actualizarTrabajador,
    crearTrabajador,
} from "@/src/modules/trabajadores/api/services";
import { ESTADOS_TRABAJADOR, Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { Turno } from "@/src/modules/turnos/types/turno";
import { UsuarioSesion } from "@/src/modules/usuarios/types/usuario";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { useEffect, useRef, useState } from "react";

export type TipoModal =
  | "alta_trabajador"
  | "editar_trabajador"
  | "baja_trabajador"
  | "reactivar_trabajador"
  | "nuevo_contrato"
  | "editar_contrato"
  | "rescindir_contrato"
  | "asignar_turno"
  | "reasignar_turno"
  | "eliminar_turno"
  | null;

export function usePlantillaFormularios(
  usuarioActual: UsuarioSesion,
  cargarPlantilla: () => Promise<void>,
  empresaIdActiva?: string,
) {
  const { mostrarError, mostrarMensaje } = useAppModal();

  const [procesando, setProcesando] = useState(false);
  const [modalActivo, setModalActivo] = useState<TipoModal>(null);
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [nifNie, setNifNie] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [passwordInicial, setPasswordInicial] = useState("");
  const [nss, setNss] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");


  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [departamentoId, setDepartamentoId] = useState<string>("");
  const [puestoTrabajo, setPuestoTrabajo] = useState("");
  const [categoriaProfesional, setCategoriaProfesional] = useState<string>("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [tipoJornada, setTipoJornada] = useState("");
  const [horasSemana, setHorasSemana] = useState("");
  const [centrosTrabajoIds, setCentrosTrabajoIds] = useState<string[]>([]);
  const [calendarioLaboralId, setCalendarioLaboralId] = useState<string>("");
  const [calendariosSeleccionadosIds, setCalendariosSeleccionadosIds] = useState<string[]>([]);
  const [archivoContrato, setArchivoContrato] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [contratoAEditar, setContratoAEditar] = useState<Contrato>();
  const [turnosSeleccionados, setTurnosSeleccionados] = useState<Turno[]>([]);

  const inputNombreRef = useRef<any>(null);
  const inputApellidosRef = useRef<any>(null);
  const inputNifRef = useRef<any>(null);
  const inputEmailRef = useRef<any>(null);
  const inputTelefonoRef = useRef<any>(null);
  const inputNssRef = useRef<any>(null);
  const inputFechaNacRef = useRef<any>(null);
  const botonGuardarAltaRef = useRef<any>(null);

  const inputTipoContratoRef = useRef<any>(null);
  const inputTipoJornadaRef = useRef<any>(null);
  const inputHorasSemanaRef = useRef<any>(null);
  const inputFechaInicioRef = useRef<any>(null);
  const inputFechaFinRef = useRef<any>(null);
  const inputPuestoRef = useRef<any>(null);
  const inputCategoriaRef = useRef<any>(null);
  const botonGuardarContratoRef = useRef<any>(null);

  const inputTurnoInicioRef = useRef<any>(null);
  const inputTurnoFinRef = useRef<any>(null);
  const botonActualizarRef = useRef<any>(null);

  const botonConfirmarBajaRef = useRef<any>(null);
  const botonConfirmarEliminarTurnoRef = useRef<any>(null);
  const botonRescindirContratoRef = useRef<any>(null);

  const cerrarModales = () => {
    setModalActivo(null);
    setTrabajadorActual(null);
    setNombre("");
    setApellidos("");
    setNifNie("");
    setEmail("");
    setTelefono("");
    setPasswordInicial("");
    setNss("");
    setFechaNacimiento("");
    setTipoContrato("");
    setTipoJornada("");
    setHorasSemana("");
    setFechaInicio("");
    setFechaFin("");
    setPuestoTrabajo("");
    setCategoriaProfesional("");
    setCentrosTrabajoIds([]);
    setDepartamentoId("");
    setCalendarioLaboralId("");
    setCalendariosSeleccionadosIds([]);
    setArchivoContrato(null);
    setTurnosSeleccionados([]);
  };

  const handleAltaTrabajadorCompleta = async () => {
    const empresaId = empresaIdActiva ?? usuarioActual?.empresa_id;
    if (!nombre || !apellidos || !nifNie || !empresaId) {
      mostrarMensaje(
        "Alerta",
        "Por favor, rellena los campos obligatorios y asegúrate de que la sesión cuenta con una empresa asignada.",
      );
      return;
    }
    try {
      setProcesando(true);
      await crearTrabajador({
        empresa_id: empresaId,
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        password: passwordInicial || null,
        dni_nif_nie: nifNie.trim().toUpperCase(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        numero_seguridad_social: nss.trim(),
        fecha_nacimiento: fechaNacimiento.trim() || null,
        estado: ESTADOS_TRABAJADOR.INACTIVO,
        fecha_alta_empresa: new Date().toISOString().slice(0, 10),
      });
      cerrarModales();
      await cargarPlantilla();
      mostrarMensaje(
        "Éxito",
        "Trabajador dado de alta. Si se creó una cuenta nueva, comunícale la contraseña inicial indicada; si el correo ya tenía cuenta, deberá usar su contraseña actual.",
      );
    } catch (error: any) {
      mostrarError(
        "Error al procesar el alta del trabajador: " +
          obtenerMensajeAmigableError(error),
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleEditarTrabajador = async () => {
    if (!trabajadorActual?.id) {
      mostrarMensaje(
        "Alerta",
        "No se pudo identificar el trabajador a editar.",
      );
      return;
    }
    if (!nombre || !apellidos || !nifNie) {
      mostrarMensaje(
        "Alerta",
        "Por favor, rellena los campos obligatorios del trabajador.",
      );
      return;
    }
    try {
      setProcesando(true);
      await actualizarTrabajador(trabajadorActual.id, {
        dni_nif_nie: nifNie.trim().toUpperCase(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        numero_seguridad_social: nss.trim(),
        fecha_nacimiento: fechaNacimiento.trim(),
      });
      await cargarPlantilla();
      cerrarModales();
      mostrarMensaje("Éxito", "Trabajador actualizado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al actualizar los datos del trabajador: " +
          obtenerMensajeAmigableError(error),
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarContrato = async () => {
    const empresaId = empresaIdActiva ?? usuarioActual?.empresa_id;
    if (!empresaId || !trabajadorActual?.id) {
      mostrarMensaje(
        "Alerta",
        "No se ha podido identificar la empresa de la sesión actual.",
      );
      return;
    }
    try {
      setProcesando(true);
      const contrato = await crearContrato({
        empresa_id: empresaId,
        centros_trabajo_ids: centrosTrabajoIds,
        tipo_contrato: tipoContrato as import("@/src/modules/contratos/types/contrato").TipoContrato,
        tipo_jornada: tipoJornada as import("@/src/modules/contratos/types/contrato").TipoJornada,
        horas_semana: Number(horasSemana),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        departamento_id: departamentoId,
        puesto_trabajo: puestoTrabajo,
        categoria_profesional: categoriaProfesional,
        trabajador_id: trabajadorActual.id,
      });
      for (const calendarioId of calendariosSeleccionadosIds.length ? calendariosSeleccionadosIds : (calendarioLaboralId ? [calendarioLaboralId] : [])) {
        await crearContratoCalendario({ contrato_id: contrato.id, calendario_laboral_id: calendarioId });
      }
      if (turnosSeleccionados.length) {
        await asignarTurnosTrabajador(contrato.id, turnosSeleccionados.map((turno) => turno.id), fechaInicio, fechaFin || null);
      }
      if (archivoContrato) await subirDocumentoContrato(contrato.id, archivoContrato);
      await cargarPlantilla();
      cerrarModales();
      mostrarMensaje("Éxito", "Contrato registrado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al guardar el nuevo contrato del trabajador: " +
          obtenerMensajeAmigableError(error),
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarTurnos = async () => {
    if (!trabajadorActual) return;
    try {
      setProcesando(true);
      await eliminarTodasAsignacionesTrabajador(trabajadorActual.id);
      cerrarModales();
      await cargarPlantilla();
      mostrarMensaje(
        "Éxito",
        "Asignaciones de turno eliminadas correctamente.",
      );
    } catch (error: any) {
      mostrarError(
        "Error al eliminar las asignaciones de turno del trabajador: " +
          obtenerMensajeAmigableError(error),
      );
    } finally {
      setProcesando(false);
    }
  };

  return {
    procesando,
    setProcesando,
    modalActivo,
    setModalActivo,
    trabajadorActual,
    setTrabajadorActual,
    nombre,
    setNombre,
    apellidos,
    setApellidos,
    nifNie,
    setNifNie,
    email,
    setEmail,
    telefono,
    setTelefono,
    passwordInicial,
    setPasswordInicial,
    nss,
    setNss,
    fechaNacimiento,
    setFechaNacimiento,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    departamentoId,
    setDepartamentoId,
    puestoTrabajo,
    setPuestoTrabajo,
    categoriaProfesional,
    setCategoriaProfesional,
    tipoContrato,
    setTipoContrato,
    tipoJornada,
    setTipoJornada,
    horasSemana,
    setHorasSemana,
    centrosTrabajoIds,
    setCentrosTrabajoIds,
    calendarioLaboralId,
    setCalendarioLaboralId,
    calendariosSeleccionadosIds,
    setCalendariosSeleccionadosIds,
    archivoContrato,
    setArchivoContrato,
    contratoAEditar,
    setContratoAEditar,
    turnosSeleccionados,
    setTurnosSeleccionados,
    cerrarModales,
    handleAltaTrabajadorCompleta,
    handleEditarTrabajador,
    handleGuardarContrato,
    handleEliminarTurnos,
    inputRefs: {
      inputNombreRef,
      inputApellidosRef,
      inputNifRef,
      inputEmailRef,
      inputTelefonoRef,
      inputNssRef,
      inputFechaNacRef,
      botonGuardarAltaRef,
      inputTipoContratoRef,
      inputTipoJornadaRef,
      inputHorasSemanaRef,
      inputFechaInicioRef,
      inputFechaFinRef,
      inputPuestoRef,
      inputCategoriaRef,
      botonGuardarContratoRef,
      inputTurnoInicioRef,
      inputTurnoFinRef,
      botonActualizarRef,
      botonConfirmarBajaRef,
      botonConfirmarEliminarTurnoRef,
      botonRescindirContratoRef,
    },
  };
}
