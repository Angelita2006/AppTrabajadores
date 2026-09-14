import { eliminarTodasAsignacionesTrabajador } from "@/src/modules/asignaciones-turno/api/services";
import { crearContrato } from "@/src/modules/contratos/api/services";
import { Contrato } from "@/src/modules/contratos/types/contrato";
import { obtenerRoles } from "@/src/modules/roles/api/services";
import { Rol } from "@/src/modules/roles/types/rol";
import {
  actualizarTrabajador,
  crearTrabajador,
} from "@/src/modules/trabajadores/api/services";
import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { Turno } from "@/src/modules/turnos/types/turno";
import { UsuarioSesion } from "@/src/modules/usuarios/types/usuario";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
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
) {
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
  const [nss, setNss] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [rolesDisponibles, setRolesDisponibles] = useState<Rol[]>([]);
  const [tipoRol, setTipoRol] = useState<string>("");

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [departamentoId, setDepartamentoId] = useState<string>("");
  const [puestoTrabajo, setPuestoTrabajo] = useState("");
  const [categoriaProfesional, setCategoriaProfesional] = useState<string>("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [tipoJornada, setTipoJornada] = useState("");
  const [horasSemana, setHorasSemana] = useState("");
  const [centroTrabajoId, setCentroTrabajoId] = useState("");
  const [calendarioLaboralId, setCalendarioLaboralId] = useState<string>("");
  const [contratoAEditar, setContratoAEditar] = useState<Contrato>();
  const [turnosSeleccionados, setTurnosSeleccionados] = useState<Turno[]>([]);

  useEffect(() => {
    obtenerRoles()
      .then((roles: Rol[]) => {
        setRolesDisponibles(roles);
        if (roles.length > 0 && !tipoRol) {
          setTipoRol(roles[0].id);
        }
      })
      .catch((error: any) => {
        mostrarError(
          "Error al cargar los roles disponibles del sistema: " + error.message,
        );
      });
  }, []);

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
    setNss("");
    setFechaNacimiento("");
    setTipoRol(rolesDisponibles.length > 0 ? rolesDisponibles[0].id : "");
    setTipoContrato("");
    setTipoJornada("");
    setHorasSemana("");
    setFechaInicio("");
    setFechaFin("");
    setPuestoTrabajo("");
    setCategoriaProfesional("");
    setCentroTrabajoId("");
    setDepartamentoId("");
    setCalendarioLaboralId("");
    setTurnosSeleccionados([]);
  };

  const handleAltaTrabajadorCompleta = async () => {
    if (!nombre || !apellidos || !nifNie || !usuarioActual?.empresa_id) {
      mostrarMensaje(
        "Alerta",
        "Por favor, rellena los campos obligatorios y asegúrate de que la sesión cuenta con una empresa asignada.",
      );
      return;
    }
    try {
      setProcesando(true);
      await crearTrabajador({
        empresa_id: usuarioActual.empresa_id,
        dni_nif_nie: nifNie.trim().toUpperCase(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        telefono: telefono.trim() ? telefono.trim() : undefined,
        numero_seguridad_social: nss.trim(),
        fecha_nacimiento: fechaNacimiento.trim(),
        rol_id: tipoRol,
      });
      cerrarModales();
      await cargarPlantilla();
      mostrarMensaje("Éxito", "Trabajador dado de alta correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al procesar el alta del trabajador: " + error.message,
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
        email: email.trim() ? email.trim().toLowerCase() : null,
        telefono: telefono.trim() ? telefono.trim() : null,
        numero_seguridad_social: nss.trim(),
        fecha_nacimiento: fechaNacimiento.trim(),
        rol_id: tipoRol,
      });
      await cargarPlantilla();
      cerrarModales();
      mostrarMensaje("Éxito", "Trabajador actualizado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al actualizar los datos del trabajador: " + error.message,
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarContrato = async () => {
    if (!usuarioActual?.empresa_id) {
      mostrarMensaje(
        "Alerta",
        "No se ha podido identificar la empresa de la sesión actual.",
      );
      return;
    }
    try {
      setProcesando(true);
      await crearContrato({
        empresa_id: usuarioActual.empresa_id,
        centro_trabajo_id: centroTrabajoId,
        tipo_contrato: tipoContrato,
        tipo_jornada: tipoJornada,
        horas_semana: Number(horasSemana),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || "",
        departamento_id: departamentoId,
        puesto_trabajo: puestoTrabajo,
        categoria_profesional: categoriaProfesional,
        trabajador_id: trabajadorActual!.id,
        calendario_laboral_id: calendarioLaboralId,
      });
      await cargarPlantilla();
      cerrarModales();
      mostrarMensaje("Éxito", "Contrato registrado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al guardar el nuevo contrato del trabajador: " + error.message,
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
          error.message,
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
    nss,
    setNss,
    fechaNacimiento,
    setFechaNacimiento,
    tipoRol,
    setTipoRol,
    rolesDisponibles,
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
    centroTrabajoId,
    setCentroTrabajoId,
    calendarioLaboralId,
    setCalendarioLaboralId,
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
