import api from "@/src/service/api/api";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  RegistroOrganizacionDTO,
  RespuestaRegistroCompleto,
} from "../empresas/types/empresa";

/**
 * Registra de forma atómica una nueva empresa o gestoría, su primer expediente de trabajador y la cuenta de usuario de sesión vinculada.
 * URI: POST /api/empresas/registro-completo
 *
 * @async
 * @function registrarOrganizacionCompleta
 * @param {RegistroOrganizacionDTO} payload - Objeto con los datos necesarios para el alta de la organización, el administrador y el indicador de gestoría.
 * @returns {Promise<RespuestaRegistroCompleto>} Promesa con los datos completos de la empresa, trabajador y usuario creados.
 * @throws {Error} Lanza un error si falla la transacción atómica en el servidor.
 */
export const registrarOrganizacionCompleta = async (
  payload: RegistroOrganizacionDTO,
): Promise<RespuestaRegistroCompleto> => {
  try {
    // Petición única y atómica al backend que maneja el rollback automático si algo falla
    const response = await api.post<RespuestaRegistroCompleto>(
      "/api/empresas/registro-completo",
      {
        codigo_licencia: payload.codigo_licencia,
        nombre_comercial: payload.nombre_comercial,
        razon_social: payload.razon_social,
        cif: payload.cif,
        zona_horaria: "Europe/Madrid",
        configuracion: {},
        codigo_cnae: payload.codigo_cnae ? String(payload.codigo_cnae) : null,
        convenio_colectivo: payload.convenio_colectivo,
        direccion_fiscal: payload.direccion_fiscal,
        logo_url: payload.logo_url || null,
        es_gestoria: payload.es_gestoria ?? false,

        // Datos del administrador / trabajador inicial
        nombre_admin: payload.nombre_admin,
        apellidos_admin: payload.apellidos_admin,
        dni_nif_nie_admin: payload.dni_nif_nie_admin,
        email_admin: payload.email_admin,
        password_raw: payload.password_raw,
        telefono_admin: payload.telefono_admin
          ? String(payload.telefono_admin)
          : null,
        nss_admin: payload.nss_admin ? String(payload.nss_admin) : null,
        fecha_nacimiento_admin: payload.fecha_nacimiento_admin,
      },
    );

    return response.data;
  } catch (error: any) {
    // Capturamos el detalle exacto que arroje FastAPI en el HTTPException (detail) o un mensaje genérico
    const apiMessage =
      error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Ha ocurrido un error inesperado al procesar el alta de organización.",
    );
  }
};

/**
 * Envía una solicitud al servidor para validar el email y despachar el token de restauración de contraseña.
 * URI: POST /api/auth/recuperar-password
 *
 * @async
 * @function solicitarCodigoRecuperacion
 * @param {string} email - Correo electrónico asociado a la cuenta de usuario.
 * @returns {Promise<any>} Promesa con la respuesta del servidor tras despachar el código.
 * @throws {Error} Lanza un error si la solicitud falla o el email no está registrado.
 */
export const solicitarCodigoRecuperacion = async (
  email: string,
): Promise<any> => {
  try {
    const response = await api.post("/api/auth/recuperar-password", { email });
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Error al solicitar el código de recuperación de contraseña.",
    );
  }
};

/**
 * Consolida el cambio definitivo de contraseña validando el token de verificación de 6 dígitos en el backend.
 * URI: POST /api/auth/confirmar-password
 *
 * @async
 * @function confirmarCambioPassword
 * @param {Object} payload - Objeto que contiene el email, el código de verificación y la nueva contraseña.
 * @returns {Promise<any>} Promesa con la respuesta del servidor al actualizar la contraseña.
 * @throws {Error} Lanza un error si el código es inválido, ha expirado o falla la operación.
 */
export const confirmarCambioPassword = async (payload: {
  email: string;
  codigo_verificacion: string;
  nueva_password: string;
}): Promise<any> => {
  try {
    const response = await api.post("/api/auth/confirmar-password", payload);
    return response.data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage || "Error al confirmar el cambio de contraseña.",
    );
  }
};

/**
 * Solicita permisos de notificaciones push, obtiene el token de Expo y lo registra en el servidor vinculado al usuario.
 * URI: POST /api/dispositivos-push/
 *
 * @async
 * @function registrarTokenDispositivo
 * @param {string} idUsuario - Identificador UUID único del usuario de sesión.
 * @returns {Promise<void>} Promesa que se resuelve cuando se completa el registro del token de dispositivo.
 * @throws {Error} Registra los errores en consola si no se otorgan permisos o falla la petición.
 */
export const registrarTokenDispositivo = async (
  idUsuario: string,
): Promise<void> => {
  try {
    // 1. Solicitar permisos (fundamental para iOS, Android y Web)
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Permiso de notificaciones denegado.");
      return;
    }

    // 2. Obtener el projectId directamente desde app.json de forma segura
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } })?.eas
        ?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.error("No se encontró el projectId de EAS en la configuración.");
      return;
    }

    // 3. Obtener el token de Expo Push
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const fcmToken = pushTokenData.data; // Token que se enviará al backend

    // 4. Enviar el token a la API de FastAPI usando Axios
    const response = await api.post("/api/dispositivos-push/", {
      usuario_id: idUsuario,
      fcm_token: fcmToken,
      plataforma: Platform.OS,
    });

    console.log(
      "Token push registrado con éxito en el servidor:",
      response.data,
    );
  } catch (error: any) {
    console.error("Error al registrar token de Expo:", error);
  }
};
