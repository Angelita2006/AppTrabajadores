import api from "../../../service/api/api";

// ====================================================================
// 1. ENDPOINTS DE AUTENTICACIÓN Y EXPENDIENTE (TABLA TRABAJADORES)
// ====================================================================

/**
 * Valida el correo y la contraseña contra la base de datos de producción.
 * @param email Correo electrónico
 * @param password Contraseña en texto plano
 */
export const getUsuarioByEmailYPassword = async (
  email: string,
  password: string,
) => {
  // Conectado al nuevo router de Usuarios / Trabajadores unificado
  const respuesta = await api.post("/api/usuarios/login", {
    email,
    password,
  });
  return respuesta.data;
};

/** Alias de compatibilidad para la función de inicio de sesión */
export const obtenerUsuarioPorEmailYPassword = getUsuarioByEmailYPassword;

/**
 * Obtiene la plantilla completa de usuarios registrados en el sistema Saas.
 */
export const obtenerUsuarios = async () => {
  const respuesta = await api.get("/api/trabajadores");
  return respuesta.data;
};

/**
 * Obtiene la plantilla completa de empleados registrados en el sistema Saas.
 */
export const obtenerTrabajadores = async () => {
  const respuesta = await api.get("/api/trabajadores");
  return respuesta.data;
};

/**
 * Recupera la información detallada de un trabajador específico mediante su UUID.
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const obtenerTrabajador = async (idTrabajador: string) => {
  const respuesta = await api.get(`/api/trabajadores/${idTrabajador}`);
  return respuesta.data;
};

/**
 * Registra un nuevo empleado en el backend bajo una estructura Multiempresa.
 */
export const crearTrabajador = async (data: {
  empresa_id: string;
  nif_nie: string;
  nombre: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  numero_seguridad_social?: string;
  fecha_nacimiento?: string; // Formato AAAA-MM-DD
}) => {
  const respuesta = await api.post("/api/trabajadores", data);
  return respuesta.data;
};

/**
 * Consulta la organización o empresa principal asignada al expediente del empleado.
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const obtenerEmpresasTrabajador = async (idTrabajador: string) => {
  const respuesta = await api.get(`/api/trabajadores/${idTrabajador}/empresas`);
  return respuesta.data;
};

// ====================================================================
// 2. ENDPOINTS PARA LA FUTURA UI (VISTAS, CONTRATOS Y PLANIFICACIÓN)
// ====================================================================

/**
 * [VISTA DE CONTROL] Recupera la secuencia histórica de contratos de un empleado.
 * Esencial para pintar el puesto, categoría y horas semanales en la UI.
 */
export const obtenerContratosTrabajador = async (idTrabajador: string) => {
  const respuesta = await api.get(`/api/contratos/trabajador/${idTrabajador}`);
  return respuesta.data;
};

/**
 * [VISTA DE PLANIFICACIÓN] Recupera el cuadrante actual de turnos teóricos del operario.
 * Necesario para dibujar los horarios asignados de lunes a domingo en la pantalla del calendario.
 * @param idTrabajador Identificador UUID del expediente del empleado
 */
export const obtenerAsignacionesTurnoTrabajador = async (
  idTrabajador: string | null,
) => {
  if (!idTrabajador || idTrabajador === "1" || idTrabajador.length < 10)
    return [];
  const respuesta = await api.get(
    `/api/asignaciones-turno/trabajador/${idTrabajador}`,
  );
  return respuesta.data;
};

/**
 * [VISTA DE CONTROL HORARIO] Consulta el histórico completo de marcajes inmutables.
 * Utilizado para rellenar las tablas de auditoría horaria en la interfaz del perfil.
 */
export const obtenerFichajesTrabajadorYEmpresa = async (
  idTrabajador: string,
  idEmpresa: string,
) => {
  const respuesta = await api.get(
    `/api/fichajes/trabajador/${idTrabajador}/empresa/${idEmpresa}`,
  );
  return respuesta.data;
};

/**
 * [VISTA DE CUADRO DE MANDO] Recupera los resúmenes diarios acumulados del empleado.
 * Alimenta los gráficos de la UI mostrando los minutos totales trabajados, pausas y horas extras.
 */
export const obtenerResumenesMensualesTrabajador = async (
  idTrabajador: string,
) => {
  const respuesta = await api.get(
    `/api/resumenes-jornada/trabajador/${idTrabajador}`,
  );
  return respuesta.data;
};

/**
 * [VISTA DE AUSENCIAS] Recupera el histórico de solicitudes de vacaciones, bajas o maternidades.
 * Alimenta las tarjetas de solicitudes de la app móvil para revisar si están aprobadas o rechazadas.
 */
export const obtenerAusenciasYVacacionesTrabajador = async (
  idTrabajador: string,
) => {
  const respuesta = await api.get(`/api/ausencias/trabajador/${idTrabajador}`);
  return respuesta.data;
};

/**
 * [VISTA DE CORRECCIONES] Recupera el registro de peticiones de rectificación horaria.
 * Permite al empleado revisar los estados de sus solicitudes de olvido de fichajes.
 */
export const obtenerCorreccionesSolicitadasTrabajador = async (
  idTrabajador: string,
) => {
  const respuesta = await api.get(
    `/api/correcciones/trabajador/${idTrabajador}`,
  );
  return respuesta.data;
};

/**
 * Envía una solicitud al servidor para validar el email y despachar el token de restauración.
 */
export const solicitarTokenRecuperacion = async (email: string) => {
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
}) => {
  const respuesta = await api.post("/api/auth/confirmar-password", data);
  return respuesta.data;
};
