import api from "@/src/service/api/api";
import {
  Departamento,
  DepartamentoCreate,
  DepartamentoUpdate,
} from "../types/departamento";

/**
 * Registra un nuevo departamento en el sistema bajo la configuración provista.
 * URI: POST /api/departamentos
 *
 * @async
 * @function crearDepartamento
 * @param {DepartamentoCreate} payload - Objeto con los datos necesarios para la creación del departamento.
 * @returns {Promise<Departamento>} Promesa con el objeto `Departamento` recién creado y persistido.
 * @throws {Error} Lanza un error si los datos no son válidos o falla el registro en el servidor.
 */
export const crearDepartamento = async (
  payload: DepartamentoCreate,
): Promise<Departamento> => {
  try {
    const response = await api.post<Departamento>(
      `/api/departamentos`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al registrar el nuevo departamento.");
  }
};

/**
 * Recupera la información detallada de un departamento específico a partir de su identificador único.
 * URI: GET /api/departamentos/{idDepartamento}
 *
 * @async
 * @function obtenerDepartamentoPorId
 * @param {string} idDepartamento - Identificador UUID único del departamento.
 * @returns {Promise<Departamento>} Promesa con el objeto `Departamento` encontrado.
 * @throws {Error} Lanza un error si el departamento no existe o falla la consulta.
 */
export const obtenerDepartamentoPorId = async (
  idDepartamento: string,
): Promise<Departamento> => {
  try {
    const response = await api.get<Departamento>(
      `/api/departamentos/${idDepartamento}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al recuperar la información del departamento ${idDepartamento}.`,
    );
  }
};

/**
 * Actualiza exclusivamente el nombre de un departamento mediante parámetros en la URL (Query Params).
 * URI: PUT /api/departamentos/{idDepartamento}?nuevo_nombre=...
 *
 * @async
 * @function actualizarDepartamento
 * @param {string} idDepartamento - Identificador UUID único del departamento a modificar.
 * @param {string} nuevoNombre - Nueva cadena de texto para el nombre del departamento.
 * @returns {Promise<Departamento>} Promesa con el objeto `Departamento` actualizado.
 * @throws {Error} Lanza un error si la API rechaza la actualización.
 */
export const actualizarDepartamento = async (
  idDepartamento: string,
  nuevoNombre: string,
): Promise<Departamento> => {
  try {
    const response = await api.put<Departamento>(
      `/api/departamentos/${idDepartamento}?nuevo_nombre=${encodeURIComponent(nuevoNombre)}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al actualizar el nombre del departamento ${idDepartamento}.`,
    );
  }
};

/**
 * Modifica de forma parcial o total las propiedades de un departamento existente usando un esquema estructurado.
 * URI: PUT /api/departamentos/{id_departamento}
 *
 * @async
 * @function editarDepartamento
 * @param {string} idDepartamento - Identificador UUID único del departamento a modificar.
 * @param {DepartamentoUpdate} payload - Objeto con los campos opcionales a actualizar.
 * @returns {Promise<Departamento>} Promesa con el objeto `Departamento` con los cambios aplicados.
 * @throws {Error} Lanza un error si el registro no existe o falla la operación.
 */
export const editarDepartamento = async (
  idDepartamento: string,
  payload: DepartamentoUpdate,
): Promise<Departamento> => {
  try {
    const response = await api.put<Departamento>(
      `/api/departamentos/${idDepartamento}`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al editar el departamento ${idDepartamento}.`,
    );
  }
};

/**
 * Da de baja o elimina un departamento de la base de datos de forma definitiva.
 * URI: DELETE /api/departamentos/{id_departamento}
 *
 * @async
 * @function eliminarDepartamento
 * @param {string} idDepartamento - Identificador UUID único del departamento a eliminar.
 * @returns {Promise<void>} Promesa que se resuelve al completar la operación de borrado.
 * @throws {Error} Lanza un error si el departamento no se encuentra o falla la operación.
 */
export const eliminarDepartamento = async (
  idDepartamento: string,
): Promise<void> => {
  try {
    await api.delete(`/api/departamentos/${idDepartamento}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al eliminar el departamento ${idDepartamento}.`,
    );
  }
};

/**
 * Obtiene el listado completo de departamentos asociados a una empresa u organización específica.
 * URI: GET /api/departamentos/empresa/{idEmpresa}
 *
 * @async
 * @function obtenerDepartamentosEmpresa
 * @param {string} idEmpresa - Identificador UUID único de la empresa.
 * @returns {Promise<Departamento[]>} Promesa con el listado de departamentos encontrados.
 * @throws {Error} Lanza un error si ocurre un fallo al obtener los departamentos.
 */
export const obtenerDepartamentosEmpresa = async (
  idEmpresa: string,
): Promise<Departamento[]> => {
  try {
    const response = await api.get<Departamento[]>(
      `/api/departamentos/empresa/${idEmpresa}`,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        `Error al obtener los departamentos de la empresa ${idEmpresa}.`,
    );
  }
};
