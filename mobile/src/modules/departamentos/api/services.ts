import api from "@/src/service/api/api";
import { Departamento, DepartamentoUpdate } from "../types/departamento";

/**
 * Devuelve la estructura de departamentos global aplicando aislamiento multi-tenant.
 */
export const obtenerTodosLosDepartamentos = async (): Promise<
  Departamento[]
> => {
  try {
    const response = await api.get<Departamento[]>("/api/departamentos");
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;

    throw new Error(
      apiMessage || "Error al obtener el listado global de departamentos.",
    );
  }
};

/**
 * Obtiene los departamentos de una empresa específica.
 * @param idEmpresa Identificador único UUID de la empresa
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

/**
 * Crea un nuevo departamento.
 */
export const crearDepartamento = async (data: {
  empresa_id: string;
  nombre: string;
  centro_trabajo_id?: string | null;
}): Promise<Departamento> => {
  try {
    const response = await api.post<Departamento>(`/api/departamentos`, data);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;

    throw new Error(apiMessage || "Error al registrar el nuevo departamento.");
  }
};

/**
 * Obtiene un departamento por su ID.
 * @param idDepartamento Identificador único UUID del departamento
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
 * Actualiza el nombre de un departamento (mediante query param en el backend).
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
 * Modifica las propiedades de un departamento existente usando el esquema parcial.
 * URI: PUT /api/departamentos/{id_departamento}/editar
 * @param id_departamento - El ID del departamento a modificar.
 * @param data - Objeto de tipo DepartamentoUpdate con los campos a actualizar.
 */
export const editarDepartamento = async (
  id_departamento: string,
  data: DepartamentoUpdate,
): Promise<Departamento> => {
  try {
    const response = await api.put<Departamento>(
      `/api/departamentos/${id_departamento}/editar`,
      data,
    );
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;

    throw new Error(
      apiMessage || `Error al editar el departamento ${id_departamento}.`,
    );
  }
};

/**
 * Elimina un departamento de la base de datos.
 * URI: DELETE /api/departamentos/{id_departamento}
 * @param id_departamento - El ID del departamento a eliminar.
 */
export const eliminarDepartamento = async (
  id_departamento: string,
): Promise<void> => {
  try {
    await api.delete(`/api/departamentos/${id_departamento}`);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al eliminar el departamento ${id_departamento}.`,
    );
  }
};
