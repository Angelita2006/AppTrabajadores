import api from "@/src/service/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registrarTokenDispositivo } from "../../another-services/services";
import {
  LoginResponse,
  UsuarioRegisterRequest,
  UsuarioResponse,
} from "../types/usuario";

/**
 * Servicio de Autenticación y Gestión de Usuarios.
 * Contiene todas las peticiones HTTP contra la API de usuarios y control de acceso.
 */

/**
 * Obtiene el listado completo de todas las cuentas de usuario registradas en el sistema.
 * URI: GET /api/usuarios
 * *Nota: Requiere privilegios de rol de Administrador.*
 *
 * @async
 * @function obtenerTodosLosUsuarios
 * @returns {Promise<UsuarioResponse[]>} Un array con la lista de todos los usuarios de la plataforma.
 * @throws {Error} Lanza un error si el usuario no tiene permisos o si ocurre un fallo de red.
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
 * Busca y recupera la información de un usuario mediante su ID único de cuenta.
 * URI: GET /api/usuarios/{id_usuario}
 *
 * @async
 * @function obtenerUsuarioPorId
 * @param {string} idUsuario - Identificador único universal (UUID) de la cuenta de usuario.
 * @returns {Promise<UsuarioResponse>} Objeto con los datos detallados del usuario solicitado.
 * @throws {Error} Lanza un error si el ID no es válido o no se encuentra el registro.
 */
export const obtenerUsuarioPorId = async (
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
 * Recupera la información de la cuenta de usuario vinculada a un trabajador específico.
 * URI: GET /api/usuarios/trabajador/{id_trabajador}
 *
 * @async
 * @function obtenerUsuarioPorTrabajador
 * @param {string} idTrabajador - Identificador único universal (UUID) del trabajador.
 * @returns {Promise<UsuarioResponse>} Objeto con los datos detallados del usuario asociado.
 * @throws {Error} Lanza un error si el trabajador no existe o falla la comunicación con el servidor.
 */
export const obtenerUsuarioPorTrabajador = async (
  idTrabajador: string,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.get<UsuarioResponse>(
      `/api/usuarios/trabajador/${idTrabajador}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Error al recuperar la cuenta de usuario vinculada al trabajador.",
    );
  }
};

/**
 * Registra una nueva cuenta de usuario de acceso en la plataforma mediante validación previa.
 * URI: POST /api/usuarios/registro
 *
 * @async
 * @function registrarUsuarioAcceso
 * @param {UsuarioRegisterRequest} payload - Objeto con los datos necesarios para el registro (NIF/NIE, credenciales, empresa, etc.).
 * @returns {Promise<UsuarioResponse>} Datos del usuario recién creado.
 * @throws {Error} Lanza un error si los datos son incorrectos o ya existe el registro.
 */
export const registrarUsuarioAcceso = async (
  payload: UsuarioRegisterRequest,
): Promise<UsuarioResponse> => {
  try {
    const respuesta = await api.post<UsuarioResponse>(
      "/api/usuarios/registro",
      payload,
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
 * Inicia sesión validando las credenciales del usuario y gestionando el token de acceso.
 * URI: POST /api/usuarios/login
 *
 * @async
 * @function iniciarSesion
 * @param {string} email - Correo electrónico registrado del usuario.
 * @param {string} password - Contraseña en texto plano del usuario.
 * @returns {Promise<LoginResponse>} Objeto con la respuesta del login que incluye el token de acceso y los datos del usuario.
 * @throws {Error} Lanza un error si la autenticación falla o si la API devuelve un mensaje de error personalizado.
 */
export const iniciarSesion = async (
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
 * Modifica el estado de activación de una cuenta de usuario permitiendo o bloqueando su acceso.
 * URI: PUT /api/usuarios/{id_usuario}/estado
 * *Nota: Requiere permisos de administrador.*
 *
 * @async
 * @function cambiarEstadoUsuario
 * @param {string} idUsuario - Identificador único universal (UUID) de la cuenta de usuario.
 * @param {boolean} activo - Estado booleano al que se desea cambiar (true para activar, false para bloquear).
 * @returns {Promise<UsuarioResponse>} Datos actualizados del usuario modificado.
 * @throws {Error} Lanza un error si no se tienen permisos o la operación falla.
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
 * Permite cambiar la contraseña de acceso de un usuario tras validar su contraseña actual.
 * URI: PUT /api/usuarios/{id_usuario}/password
 *
 * @async
 * @function cambiarPasswordUsuario
 * @param {string} idUsuario - Identificador único universal (UUID) de la cuenta de usuario.
 * @param {string} antiguaPassword - Contraseña actual en texto plano para verificación.
 * @param {string} nuevaPassword - Nueva contraseña que se desea establecer.
 * @returns {Promise<UsuarioResponse>} Datos del usuario con la confirmación del cambio.
 * @throws {Error} Lanza un error si la contraseña antigua no coincide o la nueva no cumple los requisitos.
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
