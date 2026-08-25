import api from "@/src/service/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registrarTokenDispositivo } from "../../another-services/services";
import {
  LoginResponse,
  UsuarioCreateRequest,
  UsuarioRegisterRequest,
  UsuarioResponse,
} from "../types/usuario";

/**
 * Inicia sesión. Valida el correo y la contraseña contra la base de datos de producción y almacena el token JWT.
 * @param email Correo electrónico
 * @param password Contraseña en texto plano
 */
export const getUsuarioByEmailYPassword = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    const respuesta = await api.post<LoginResponse>("/api/usuarios/login", {
      email,
      password,
    });

    if (respuesta.data?.access_token) {
      await AsyncStorage.setItem("user_token", respuesta.data.access_token);
      api.defaults.headers.common["Authorization"] =
        `Bearer ${respuesta.data.access_token}`;

      // --- AQUÍ LLAMAS AL REGISTRO PUSH ---
      // Asegúrate de importar la función que creamos antes
      if (respuesta.data.usuario?.id) {
        await registrarTokenDispositivo(respuesta.data.usuario.id);
      }
    }

    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al iniciar sesión en la plataforma.");
  }
};

/**
 * Recupera la información del usuario asociado a un trabajador específico.
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const getUsuarioByIdTrabajador = async (
  idTrabajador: string,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.get<UsuarioResponse>(
      `/api/usuarios/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al recuperar la cuenta de usuario vinculada al trabajador.",
    );
  }
};

/**
 * Recupera la información del usuario mediante su ID único.
 * @param idUsuario Identificador único de tipo UUID (string)
 */
export const getUsuarioById = async (
  idUsuario: string,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.get<UsuarioResponse>(
      `/api/usuarios/${idUsuario}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || `Error al obtener el usuario con ID ${idUsuario}.`,
    );
  }
};

/**
 * Obtiene el listado completo de cuentas de usuario (Requiere rol de Administrador).
 */
export const obtenerTodosLosUsuarios = async (): Promise<UsuarioResponse[]> => {
  try {
    const respuesta = await api.get<UsuarioResponse[]>("/api/usuarios");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al listar los usuarios de la plataforma.",
    );
  }
};

/**
 * Registra una nueva cuenta de usuario directamente en el sistema (Requiere rol de Administrador).
 */
export const crearUsuarioCuenta = async (
  data: UsuarioCreateRequest,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.post<UsuarioResponse>("/api/usuarios", data);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al registrar la nueva cuenta de usuario.",
    );
  }
};

/**
 * Registra un nuevo usuario de acceso mediante validación de NIF/NIE y empresa.
 */
export const registrarUsuarioAcceso = async (
  data: UsuarioRegisterRequest,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.post<UsuarioResponse>(
      "/api/usuarios/registro",
      data,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al completar el registro del usuario.",
    );
  }
};

/**
 * Permite activar o desactivar una cuenta de usuario bloqueando su acceso (Requiere Admin).
 */
export const cambiarEstadoUsuario = async (
  idUsuario: string,
  activo: boolean,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.put<UsuarioResponse>(
      `/api/usuarios/${idUsuario}/estado?activo=${activo}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al cambiar el estado de la cuenta.");
  }
};

/**
 * Permite cambiar la contraseña validando la contraseña actual.
 */
export const cambiarPasswordUsuario = async (
  idUsuario: string,
  antiguaPassword: string,
  nuevaPassword: string,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.put<UsuarioResponse>(
      `/api/usuarios/${idUsuario}/password`,
      null,
      {
        params: {
          antigua_password: antiguaPassword,
          nueva_password: nuevaPassword,
        },
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al actualizar la contraseña.");
  }
};
