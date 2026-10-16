import api from "@/src/service/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  AccesoUsuario,
  ConfirmarPasswordRecuperacionRequest,
  LoginRequest,
  LoginResponse,
  PasswordCambioRequest,
  UsuarioCreate,
  UsuarioSimpleResponse,
  UsuarioUpdate,
} from "../types/usuario";

interface RespuestaDetalle {
  detail: string;
}

const mensajeErrorApi = (error: any, mensajeGenerico: string): Error =>
  new Error(
    error?.response?.data?.detail ||
      error?.response?.data?.message ||
      mensajeGenerico,
  );

/**
 * Servicio de autenticación y gestión de usuarios.
 * Consume los endpoints declarados por el router /api/usuarios.
 */

/**
 * Lista las cuentas de usuario visibles para el superadministrador.
 * URI: GET /api/usuarios
 * @async
 * @function obtenerTodosLosUsuarios
 * @returns {Promise<UsuarioSimpleResponse[]>} Usuarios de la plataforma.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerTodosLosUsuarios = async (): Promise<UsuarioSimpleResponse[]> => {
  try {
    return (await api.get<UsuarioSimpleResponse[]>("/api/usuarios")).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al listar los usuarios de la plataforma.");
  }
};

/**
 * Registra una cuenta con los campos de UsuarioCreate.
 * URI: POST /api/usuarios/registro
 * @async
 * @function registrarUsuarioAcceso
 * @param {UsuarioCreate} payload - Datos de la cuenta y contraseña.
 * @returns {Promise<UsuarioSimpleResponse>} Cuenta creada sin datos sensibles.
 * @throws {Error} Mensaje de la API o error genérico de registro.
 */
export const registrarUsuarioAcceso = async (
  payload: UsuarioCreate,
): Promise<UsuarioSimpleResponse> => {
  try {
    return (
      await api.post<UsuarioSimpleResponse>("/api/usuarios/registro", payload)
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al completar el registro del usuario.");
  }
};

/**
 * Inicia sesión y almacena el token devuelto por la API.
 * URI: POST /api/usuarios/login
 * @async
 * @function iniciarSesion
 * @param {string} email - Correo de la cuenta.
 * @param {string} password - Contraseña de acceso.
 * @returns {Promise<LoginResponse>} Token y datos simples del usuario.
 * @throws {Error} Mensaje de la API o error genérico de autenticación.
 */
export const iniciarSesion = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    const credenciales: LoginRequest = { email, password };
    const { data } = await api.post<LoginResponse>(
      "/api/usuarios/login",
      credenciales,
    );

    if (data.access_token) {
      await AsyncStorage.setItem("user_token", data.access_token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
    }

    return data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al iniciar sesión en la plataforma.");
  }
};

/**
 * Obtiene el perfil de la cuenta autenticada.
 * URI: GET /api/usuarios/me
 * @async
 * @function obtenerUsuarioActual
 * @returns {Promise<UsuarioSimpleResponse>} Perfil sin contraseña ni campos de rol.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerUsuarioActual = async (): Promise<UsuarioSimpleResponse> => {
  try {
    return (await api.get<UsuarioSimpleResponse>("/api/usuarios/me")).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al recuperar el perfil del usuario.");
  }
};

/**
 * Obtiene las empresas, roles y permisos efectivos de la cuenta autenticada.
 * URI: GET /api/usuarios/me/accesos?empresa_id={empresaId}
 * @async
 * @function obtenerMisAccesos
 * @param {string} [empresaId] - Empresa por la que filtrar los accesos.
 * @returns {Promise<AccesoUsuario[]>} Membresías y permisos efectivos.
 * @throws {Error} Mensaje de la API o error genérico de consulta.
 */
export const obtenerMisAccesos = async (
  empresaId?: string,
): Promise<AccesoUsuario[]> => {
  try {
    return (
      await api.get<AccesoUsuario[]>("/api/usuarios/me/accesos", {
        params: empresaId ? { empresa_id: empresaId } : undefined,
        skipEmpresaContext: true,
      } as any)
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al obtener los accesos de la cuenta.");
  }
};

/**
 * Sube el avatar de la cuenta autenticada.
 * URI: PUT /api/usuarios/me/foto (multipart/form-data, campo `file`).
 * @async
 * @function actualizarFotoUsuario
 * @param {string} fileUri - URI local del archivo.
 * @param {string} fileName - Nombre del archivo.
 * @param {string} fileType - Tipo MIME del archivo.
 * @returns {Promise<UsuarioSimpleResponse>} Perfil con el avatar actualizado.
 * @throws {Error} Mensaje de la API o error genérico de subida.
 */
export const actualizarFotoUsuario = async (
  fileUri: string,
  fileName: string,
  fileType: string,
): Promise<UsuarioSimpleResponse> => {
  try {
    const formData = new FormData();
    if (Platform.OS === "web") {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append("file", blob, fileName);
    } else {
      formData.append(
        "file",
        { uri: fileUri, name: fileName, type: fileType } as any,
      );
    }

    return (
      await api.put<UsuarioSimpleResponse>("/api/usuarios/me/foto", formData)
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "No se pudo actualizar el avatar de la cuenta.");
  }
};

/**
 * Cambia el estado de una cuenta de usuario.
 * URI: PUT /api/usuarios/{id_usuario}/estado
 * @async
 * @function cambiarEstadoUsuario
 * @param {string} idUsuario - UUID del usuario.
 * @param {boolean} activo - Nuevo estado enviado en el body.
 * @returns {Promise<UsuarioSimpleResponse>} Usuario actualizado.
 * @throws {Error} Mensaje de la API o error genérico de modificación.
 */
export const cambiarEstadoUsuario = async (
  idUsuario: string,
  activo: boolean,
): Promise<UsuarioSimpleResponse> => {
  try {
    return (
      await api.put<UsuarioSimpleResponse>(
        `/api/usuarios/${idUsuario}/estado`,
        { activo } satisfies UsuarioUpdate,
      )
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al cambiar el estado de la cuenta.");
  }
};

/**
 * Solicita cambiar el correo y envía el enlace al nuevo email.
 * URI: PUT /api/usuarios/solicitar-cambio-email?nuevo_email={email}
 * @async
 * @function solicitarCambioEmail
 * @param {string} nuevoEmail - Correo nuevo enviado como query param.
 * @returns {Promise<RespuestaDetalle>} Confirmación del envío.
 * @throws {Error} Mensaje de la API o error genérico de solicitud.
 */
export const solicitarCambioEmail = async (
  nuevoEmail: string,
): Promise<RespuestaDetalle> => {
  try {
    return (
      await api.put<RespuestaDetalle>("/api/usuarios/solicitar-cambio-email", null, {
        params: { nuevo_email: nuevoEmail },
      })
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al solicitar el cambio de correo electrónico.");
  }
};

/**
 * Confirma el cambio de correo usando el token de la URL.
 * URI: POST /api/usuarios/confirmar-cambio-email?token={token}
 * @async
 * @function confirmarCambioEmail
 * @param {string} token - Token de confirmación.
 * @returns {Promise<RespuestaDetalle>} Confirmación del cambio.
 * @throws {Error} Mensaje de la API o error genérico de confirmación.
 */
export const confirmarCambioEmail = async (
  token: string,
): Promise<RespuestaDetalle> => {
  try {
    return (
      await api.post<RespuestaDetalle>("/api/usuarios/confirmar-cambio-email", null, {
        params: { token },
      })
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al confirmar el cambio de correo electrónico.");
  }
};

/**
 * Solicita un código de verificación para cambiar la contraseña.
 * URI: PUT /api/usuarios/solicitar-cambio-password
 * @async
 * @function solicitarCambioPassword
 * @param {string} antiguaPassword - Contraseña actual enviada en el body.
 * @returns {Promise<RespuestaDetalle>} Confirmación del envío del código.
 * @throws {Error} Mensaje de la API o error genérico de solicitud.
 */
export const solicitarCambioPassword = async (
  antiguaPassword: string,
): Promise<RespuestaDetalle> => {
  try {
    const payload: PasswordCambioRequest = { antigua_password: antiguaPassword };
    return (
      await api.put<RespuestaDetalle>(
        "/api/usuarios/solicitar-cambio-password",
        payload,
      )
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al solicitar el código de cambio de contraseña.");
  }
};

/**
 * Confirma el cambio de contraseña usando el código de recuperación.
 * URI: POST /api/usuarios/confirmar-cambio-password
 * @async
 * @function confirmarCambioPassword
 * @param {ConfirmarPasswordRecuperacionRequest} payload - Código y nueva contraseña.
 * @returns {Promise<RespuestaDetalle>} Confirmación de la operación.
 * @throws {Error} Mensaje de la API o error genérico de confirmación.
 */
export const confirmarCambioPassword = async (
  payload: ConfirmarPasswordRecuperacionRequest,
): Promise<RespuestaDetalle> => {
  try {
    return (
      await api.post<RespuestaDetalle>(
        "/api/usuarios/confirmar-cambio-password",
        payload,
      )
    ).data;
  } catch (error: any) {
    throw mensajeErrorApi(error, "Error al confirmar la nueva contraseña.");
  }
};

export type { AccesoUsuario } from "../types/usuario";
