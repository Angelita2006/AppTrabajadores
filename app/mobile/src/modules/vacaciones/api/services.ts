import api from "../../../service/api/api";

/**
 * Obtiene el registro histórico global de todas las solicitudes de vacaciones del sistema.
 */
export const obtenerVacaciones = async () => {
  const respuesta = await api.get("api/vacaciones");
  return respuesta.data;
};

/**
 * Recupera el historial exclusivo de periodos solicitados por un empleado concreto.
 */
export const obtenerVacacionesTrabajador = async (idTrabajador: number) => {
  const respuesta = await api.get(`api/vacaciones/trabajador/${idTrabajador}`);
  return respuesta.data;
};

/**
 * Envía una nueva solicitud de vacaciones al servidor en estado 'pendiente' por defecto.
 */
export const createVacacion = async (data: {
  idTrabajador: number;
  idEmpresa: number;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
}) => {
  const respuesta = await api.post("api/vacaciones", data);
  return respuesta.data;
};

/**
 * Alias de compatibilidad para la función de creación de periodos vacacionales.
 */
export const crearVacacion = createVacacion;

/**
 * Modifica el estado de una solicitud para tramitarla como 'aprobada' o 'rechazada'.
 */
export const responderSolicitudVacacion = async (
  idVacacion: number,
  nuevoEstado: "aprobada" | "rechazada",
) => {
  const respuesta = await api.put(
    `api/vacaciones/${idVacacion}/responder?nuevo_estado=${nuevoEstado}`,
  );
  return respuesta.data;
};
