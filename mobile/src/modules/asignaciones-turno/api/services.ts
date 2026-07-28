import api from "@/src/service/api/api";

/**
 * Recupera el cuadrante actual de turnos teóricos del operario.
 * @param idTrabajador Identificador UUID del expediente del empleado
 */
export const obtenerAsignacionesTurnoTrabajador = async (
  idTrabajador: string | null,
): Promise<any[]> => {
  if (!idTrabajador || idTrabajador === "1" || idTrabajador.length < 10)
    return [];
  const respuesta = await api.get(
    `/api/asignaciones-turno/trabajador/${idTrabajador}`,
  );
  return respuesta.data;
};

/**
 * Elimina todas las asignaciones de turno vinculadas a un trabajador específico.
 * @param idTrabajador Identificador UUID del expediente del empleado
 */
export const eliminarTodasAsignacionesTrabajador = async (
  idTrabajador: string | null,
): Promise<any> => {
  if (!idTrabajador || idTrabajador === "1" || idTrabajador.length < 10)
    return null;
  const respuesta = await api.delete(
    `/api/asignaciones-turno/trabajador/${idTrabajador}/eliminar-todas`,
  );
  return respuesta.data;
};
