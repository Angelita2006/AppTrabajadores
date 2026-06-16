import api from "../../../services/api/api";

/**
 * Valida el correo y la contraseña contra la base de datos SQLite real del backend.
 */
export const getTrabajadorByEmailYPassword = async (
  email: string,
  password: string,
) => {
  const respuesta = await api.post("api/trabajadores/login", {
    email,
    password,
  });
  return respuesta.data;
};

/**
 * Alias de compatibilidad para la función de validación de credenciales.
 */
export const obtenerTrabajadorPorEmailYPassword = getTrabajadorByEmailYPassword;

/**
 * Obtiene el directorio completo con la plantilla de empleados del sistema.
 */
export const obtenerTrabajadores = async () => {
  const respuesta = await api.get("api/trabajadores");
  return respuesta.data;
};

/**
 * Recupera la información detallada de un trabajador específico por su ID único.
 */
export const obtenerTrabajador = async (idTrabajador: number) => {
  const respuesta = await api.get(`api/trabajadores/${idTrabajador}`);
  return respuesta.data;
};

/**
 * Registra un nuevo empleado en la base de datos del backend.
 */
export const crearTrabajador = async (data: {
  nombre: string;
  apellidos: string;
  dni: string;
  puesto: string;
  direccion: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
  cuenta_cotizacion: string;
  email: string;
  password: string;
}) => {
  const respuesta = await api.post("api/trabajadores", data);
  return respuesta.data;
};

/**
 * Modifica los datos de un trabajador existente localizándolo por su ID único.
 */
export const editarTrabajador = async (idTrabajador: number, data: any) => {
  const respuesta = await api.put(`api/trabajadores/${idTrabajador}`, data);
  return respuesta.data;
};

/**
 * Modifica el perfil de un empleado localizándolo mediante su número de DNI.
 */
export const editarTrabajadorPorDNI = async (dni: string, data: any) => {
  const respuesta = await api.put(`api/trabajadores/dni/${dni}`, data);
  return respuesta.data;
};

/**
 * Consulta el listado de empresas asociadas al perfil de un trabajador a través de su ID.
 */
export const obtenerEmpresasTrabajador = async (idTrabajador: number) => {
  const respuesta = await api.get(`api/trabajadores/${idTrabajador}/empresas`);
  return respuesta.data;
};

/**
 * Recupera el historial total de fichajes realizados por un empleado específico.
 */
export const obtenerFichajesTorabajador = async (idTrabajador: number) => {
  const respuesta = await api.get(`api/fichajes?idTrabajador=${idTrabajador}`);
  return respuesta.data;
};

/**
 * Consulta los cuadrantes de horarios asignados a las jornadas de un empleado.
 */
export const obtenerHorariosTrabajador = async (idTrabajador: number) => {
  const respuesta = await api.get(`api/horarios?idTrabajador=${idTrabajador}`);
  return respuesta.data;
};

/**
 * Establece un vínculo de asociación mutua entre un empleado y una empresa.
 */
export const agregarEmpresaATrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
) => {
  const respuesta = await api.post(
    `api/trabajadores/${idTrabajador}/empresas/${idEmpresa}`,
  );
  return respuesta.data;
};

/**
 * Modifica exclusivamente el estado operativo de un empleado usando su DNI.
 */
export const editarEstadoTrabajador = async (dni: string, estado: string) => {
  const respuesta = await api.put(`api/trabajadores/dni/${dni}/estado`, {
    estado,
  });
  return respuesta.data;
};

/**
 * Obtiene el último evento de fichaje registrado por el empleado en una empresa determinada.
 */
export const getUltimoFichajeTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
) => {
  const respuesta = await api.get(
    `api/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}/ultimo`,
  );
  return respuesta.data;
};

/**
 * Obtiene el historial completo de fichajes de un empleado filtrado por una empresa específica.
 */
export const obtenerFichajesEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
) => {
  const respuesta = await api.get(
    `api/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
  );
  return respuesta.data;
};
