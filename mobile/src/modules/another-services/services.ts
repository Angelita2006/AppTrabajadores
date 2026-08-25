import api from "@/src/service/api/api";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { obtenerEmpresaPorCif } from "../empresas/api/services";
import {
  RegistroOrganizacionDTO,
  RespuestaRegistroCompleto,
} from "../empresas/types/empresa";
import { Trabajador, UsuarioSesion } from "../trabajadores/types/trabajador";

/**
 * Registra en cadena una nueva Empresa, su primer expediente de Trabajador
 * y la cuenta de UsuarioSesion (con rol admin_empresa) vinculada.
 */
export const registrarOrganizacionCompleta = async (
  datos: RegistroOrganizacionDTO,
): Promise<RespuestaRegistroCompleto> => {
  try {
    // 1. Crear la empresa
    await api.post("/api/empresas", {
      nombre_comercial: datos.nombre_comercial,
      razon_social: datos.razon_social || datos.nombre_comercial,
      cif: datos.cif,
      zona_horaria: "Europe/Madrid",
      configuracion: {},
      codigo_cnae: null,
      convenio_colectivo: null,
      direccion_fiscal: null,
    });

    // 2. Recuperar la empresa recién creada utilizando tu método por CIF
    const empresaCreada = await obtenerEmpresaPorCif(datos.cif);

    if (!empresaCreada || !empresaCreada.id) {
      throw new Error(
        "No se pudo obtener el identificador de la empresa registrada.",
      );
    }

    // 3. Crear el trabajador asociado usando el ID obtenido
    const responseTrabajador = await api.post<Trabajador>("/api/trabajadores", {
      empresa_id: empresaCreada.id,
      nif_nie: "",
      nombre: datos.nombre_admin || "Admin",
      apellidos: datos.apellidos_admin || datos.nombre_comercial,
      email: datos.email,
      telefono: null,
      numero_seguridad_social: null,
      fecha_nacimiento: null,
    });

    const trabajadorCreado = responseTrabajador.data;

    // 4. Crear el usuario administrador vinculado
    const responseUsuario = await api.post<UsuarioSesion>("/api/usuarios", {
      nombre: `${trabajadorCreado.nombre} ${trabajadorCreado.apellidos}`,
      email: datos.email,
      password_raw: datos.password_raw,
      tipo_usuario: "Admin_empresa",
      empresa_id: empresaCreada.id,
      trabajador_id: trabajadorCreado.id,
    });

    const usuarioCreado = responseUsuario.data;

    return {
      empresa: empresaCreada,
      trabajador: trabajadorCreado,
      usuario: usuarioCreado,
    };
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    throw new Error(
      apiMessage ||
        "Ha ocurrido un error inesperado al procesar el alta de organización.",
    );
  }
};

/**
 * Envía una solicitud al servidor para validar el email y despachar el token de restauración.
 */
export const solicitarCodigoRecuperacion = async (
  email: string,
): Promise<any> => {
  const respuesta = await api.post("/api/auth/recuperar-password", { email });
  return respuesta.data;
};

/**
 * Consolida el cambio definitivo de clave validando el token de 6 dígitos en el backend.
 */
export const confirmarCambioPassword = async (data: {
  email: string;
  codigo_verificacion: string;
  nueva_password: string;
}): Promise<any> => {
  const respuesta = await api.post("/api/auth/confirmar-password", data);
  return respuesta.data;
};

export async function registrarTokenDispositivo(usuarioId: string) {
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

    // 4. Enviar el token a tu API de FastAPI usando Axios
    const respuesta = await api.post("/api/dispositivos-push/", {
      usuario_id: usuarioId,
      fcm_token: fcmToken,
      plataforma: Platform.OS,
    });

    console.log(
      "Token push registrado con éxito en el servidor:",
      respuesta.data,
    );
  } catch (error) {
    console.error("Error al registrar token de Expo:", error);
  }
}
