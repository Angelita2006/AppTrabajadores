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
 * Solicita el cambio de correo electrónico generando un enlace de verificación.
 * URI: POST /api/usuarios/solicitar-cambio-email
 */
export const solicitarCambioEmail = async (
  nuevoEmail: string,
): Promise<any> => {
  try {
    const respuesta = await api.put(
      "/api/usuarios/solicitar-cambio-email",
      null,
      { params: { nuevo_email: nuevoEmail } },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al solicitar el cambio de correo electrónico.",
    );
  }
};

export const confirmarCambioEmail = async (token: string) => {
  const response = await api.post(
    `/api/usuarios/confirmar-cambio-email?token=${token}`,
  );
  return response.data;
};

/**
 * Solicita un código de 6 dígitos para el cambio de contraseña (Paso 1).
 * URI: POST /api/usuarios/solicitar-cambio-password
 */
export const solicitarCambioPassword = async (
  antiguaPassword: string,
): Promise<any> => {
  try {
    const respuesta = await api.put("/api/usuarios/solicitar-cambio-password", {
      antigua_password: antiguaPassword,
    });
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al solicitar el código de cambio de contraseña.",
    );
  }
};

/**
 * Confirma el cambio de contraseña introduciendo el código y la nueva contraseña (Paso 2).
 * URI: POST /api/usuarios/confirmar-cambio-password
 */
export const confirmarCambioPassword = async (
  codigoVerificacion: string,
  nuevaPassword: string,
): Promise<any> => {
  try {
    const respuesta = await api.post(
      "/api/usuarios/confirmar-cambio-password",
      {
        codigo_verificacion: codigoVerificacion,
        nueva_password: nuevaPassword,
      },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(apiMessage || "Error al confirmar la nueva contraseña.");
  }
};

/**
 * Obtiene la información completa del usuario actualmente autenticado mediante el token de sesión.
 * URI: GET /api/usuarios/me
 *
 * @async
 * @function obtenerUsuarioActual
 * @returns {Promise<UsuarioResponse>} Objeto con los datos detallados del usuario de la sesión.
 * @throws {Error} Lanza un error si el token ha expirado o no es válido.
 */
export const obtenerUsuarioActual = async (): Promise<UsuarioResponse> => {
  try {
    const token = await AsyncStorage.getItem("user_token");
    const respuesta = await api.get<UsuarioResponse>(
      `/api/usuarios/me?token=${token}`,
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al recuperar la información del usuario actual.",
    );
  }
};
