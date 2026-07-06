import api from "../../../service/api/api";
import { ItemTurno } from "../types/turno";

/**
 * Recupera el turno por el id.
 */
export const obtenerTurno = async (idTurno: string): Promise<ItemTurno> => {
  const respuesta = await api.get(`api/turnos/${idTurno}`);
  return respuesta.data;
};
