import api from "../../../services/api/api";

/**
 * Obtiene el historial absoluto de todas las incidencias guardadas en el sistema.
 */
export const obtenerIncidencias = async () => {
  const respuesta = await api.get("api/incidencias");
  return respuesta.data;
};

/**
 * Recupera todas las incidencias reportadas por un empleado concreto.
 */
export const obtenerIncidenciasTrabajador = async (idTrabajador: number) => {
  const respuesta = await api.get(`api/incidencias/trabajador/${idTrabajador}`);
  return respuesta.data;
};

/**
 * Envía un nuevo reporte de incidencia al servidor en estado 'abierta' por defecto.
 */
export const createIncidencia = async (data: {
  idTrabajador: number;
  idEmpresa: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}) => {
  const respuesta = await api.post("api/incidencias", data);
  return respuesta.data;
};

/**
 * Alias de compatibilidad para la función de creación de reportes.
 */
export const crearIncidencia = createIncidencia;

/**
 * Modifica el estado de una incidencia abierta para marcarla como 'resuelta'.
 */
export const resolverIncidencia = async (idIncidencia: number) => {
  const respuesta = await api.put(`api/incidencias/${idIncidencia}/resolver`);
  return respuesta.data;
};
