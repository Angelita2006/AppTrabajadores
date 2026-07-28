import api from "@/src/service/api/api";
import {
  Empresa,
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
    const responseEmpresa = await api.post<Empresa>("/api/empresas", {
      nombre_comercial: datos.nombre_comercial,
      razon_social: datos.razon_social || datos.nombre_comercial,
      cif: datos.cif,
      zona_horaria: "Europe/Madrid",
      configuracion: {},
      codigo_cnae: null,
      convenio_colectivo: null,
      direccion_fiscal: null,
    });

    const empresaCreada = responseEmpresa.data;

    const responseTrabajador = await api.post<Trabajador>("/api/trabajadores", {
      empresa_id: empresaCreada.id,
      nif_nie: datos.cif,
      nombre: datos.nombre_admin || "Admin",
      apellidos: datos.apellidos_admin || datos.nombre_comercial,
      email: datos.email,
      telefono: null,
      numero_seguridad_social: null,
      fecha_nacimiento: null,
    });

    const trabajadorCreado = responseTrabajador.data;

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
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Ha ocurrido un error inesperado al procesar el alta de organización.",
    );
  }
};

/**
 * Envía una solicitud al servidor para validar el email y despachar el token de restauración.
 */
export const solicitarTokenRecuperacion = async (
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
  token_verificacion: string;
  nuevo_password: string;
}): Promise<any> => {
  const respuesta = await api.post("/api/auth/confirmar-password", data);
  return respuesta.data;
};
