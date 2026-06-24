import api from "../../../service/api/api.js";

/** Registra un nuevo evento de fichaje (entrada, salida o descanso) en el servidor de Python. */
export const crearFichaje = async (
  idTrabajador: number,
  idEmpresa: number,
  tipo: string,
) => {
  const respuesta = await api.post("api/fichajes", {
    idTrabajador,
    idEmpresa,
    tipo,
  });
  return respuesta.data;
};

/** Obtiene el historial absoluto de fichajes registrados de la plataforma. */
export const obtenerFichajes = async () => {
  const respuesta = await api.get("api/fichajes");
  return respuesta.data;
};

/** Recupera los marcajes diarios filtrados por empleado y organización desde la base de datos real. */
export const obtenerFichajesEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
) => {
  const respuesta = await api.get(
    `api/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
  );
  return respuesta.data;
};
