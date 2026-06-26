import api from "../../../service/api/api";
import { Turno } from "../types/turno";

/**
 * Recupera el turno por el id.
 */
export const obtenerTurno = async (idTurno: string): Promise<Turno> => {
  const respuesta = await api.get(`api/turnos/${idTurno}`);
  return respuesta.data;
};
