import api from "../../../service/api/api";
import {
  AusenciaCreateRequest,
  AusenciaResponse,
} from "../../ausencias/types/ausencia";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import {
  IncidenciaCreateRequest,
  IncidenciaResponse,
} from "../../correcciones-fichaje/types/incidencia";
import { Empresa } from "../../empresas/types/empresa";
import { RegistroFichaje } from "../../fichajes/types/registrofichaje";
import { UsuarioSesion } from "../types/trabajador";

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
): Promise<UsuarioSesion> => {
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
export const obtenerEmpresasTrabajador = async (
  idTrabajador: string,
): Promise<Empresa[]> => {
  const respuesta = await api.get<Empresa[]>(
    `/api/trabajadores/${idTrabajador}/empresas`,
  );
  return respuesta.data;
};

// ====================================================================
// 2. ENDPOINTS PARA LA UI (VISTAS, CONTRATOS Y PLANIFICACIÓN)
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
 * Utilizado para rellenar la tabla horaria en la interfaz del trabajador.
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

/**
 * Envía un marcaje horario inmutable hacia la tabla 'fichajes' de PostgreSQL.
 * Sincronizado con los requisitos NOT NULL de base de datos.
 */
export const registrarFichaje = async (data: {
  empresa_id: string;
  trabajador_id: string;
  centro_trabajo_id: string;
  tipo_evento_id: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  metodo_fichaje: "app_movil" | "web";
  fecha_hora_dispositivo: string;
  observaciones?: string | null;
}) => {
  const respuesta = await api.post("/api/fichajes", data);
  return respuesta.data;
};

/**
 * Descarga todos los marcajes del día actual para reconstruir el estado y el segundero.
 * Conecta con el endpoint que filtra por la fecha actual del servidor.
 */
export const obtenerFichajesHoy = async (trabajadorId: string) => {
  const respuesta = await api.get(
    `/api/fichajes/trabajador/${trabajadorId}/hoy`,
  );
  return respuesta.data;
};

export const obtenerFichajesSemanaActual = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  const respuesta = await api.get(
    `/api/fichajes/trabajador/${idTrabajador}/semana`,
  );
  return respuesta.data;
};

/**
 * Descarga de forma eficiente el marcaje más reciente del operario.
 * Apunta al endpoint especializado '/ultimo' de FastAPI de forma rápida.
 */
export const obtenerUltimoFichaje = async (trabajadorId: string) => {
  const respuesta = await api.get(
    `/api/fichajes/trabajador/${trabajadorId}/ultimo`,
  );
  return respuesta.data;
};

/**
 * Recupera un Centro de Trabajo específico desde PostgreSQL por su ID único.
 * URI: GET /api/auth/centros-trabajo/{id} o la ruta de tu APIRouter
 */
export const obtenerCentroTrabajo = async (
  centroTrabajoId: string,
): Promise<CentroTrabajo> => {
  // Ajusta el prefijo "/api/centros-trabajo" según cómo lo tengas en el @router.post de tu FastAPI
  const respuesta = await api.get(`/api/centros-trabajo/${centroTrabajoId}`);
  return respuesta.data;
};

/**
 * Recupera el historial consolidado de marcajes de toda la plantilla para una fecha concreta.
 * URI: GET /api/fichajes/empresa/{empresa_id}?fecha=YYYY-MM-DD
 */
export const obtenerFichajesEmpresaPorFecha = async (
  empresaId: string,
  fechaStr: string,
): Promise<RegistroFichaje[]> => {
  // Realiza la consulta pasando la fecha como Query Parameter (?fecha=...)
  const respuesta = await api.get(`/api/fichajes/empresa/${empresaId}`, {
    params: { fecha: fechaStr },
  });
  return respuesta.data;
};

/**
 * Transmite una nueva petición de días libres o baja hacia la tabla 'ausencias' de PostgreSQL.
 * URI: POST /api/ausencias
 */
export const solicitarAusenciaOVacaciones = async (
  data: AusenciaCreateRequest,
): Promise<AusenciaResponse> => {
  const respuesta = await api.post<AusenciaResponse>("/api/ausencias", data);
  return respuesta.data;
};

/**
 * [VISTA DE INCIDENCIAS] Envía una solicitud de rectificación horaria a Recursos Humanos.
 * URI: POST /api/correcciones
 */
export const solicitarCorreccionHoraria = async (
  data: IncidenciaCreateRequest,
): Promise<IncidenciaResponse> => {
  const respuesta = await api.post<IncidenciaResponse>(
    "/api/correcciones",
    data,
  );
  return respuesta.data;
};

/**
 * [VISTA DE INCIDENCIAS] Descarga el histórico de incidencias de un operario particular.
 * URI: GET /api/correcciones/trabajador/{id_trabajador}
 */
export const obtenerIncidenciasTrabajador = async (
  idTrabajador: string,
): Promise<IncidenciaResponse[]> => {
  const respuesta = await api.get<IncidenciaResponse[]>(
    `/api/correcciones/trabajador/${idTrabajador}`,
  );
  return respuesta.data;
};

/**
 * [CONSOLA ADMIN] Resuelve una incidencia de fichaje cambiándola a 'aprobada' o 'rechazada'.
 * URI: PUT /api/correcciones/{id_correccion}/resolver?nuevo_estado=aprobada&resolutor_usuario_id=UUID
 */
export const resolverSolicitudCorreccion = async (
  idCorreccion: string,
  nuevoEstado: "aprobada" | "rechazada",
  resolutorUsuarioId: string,
): Promise<IncidenciaResponse> => {
  const respuesta = await api.put<IncidenciaResponse>(
    `/api/correcciones/${idCorreccion}/resolver`,
    null, // El cuerpo (body) va vacío porque FastAPI lee los parámetros desde la URL
    {
      params: {
        nuevo_estado: nuevoEstado,
        resolutor_usuario_id: resolutorUsuarioId,
      },
    },
  );
  return respuesta.data;
};

/**
 * [CONSOLA ADMIN] Lista todas las correcciones solicitadas por una empresa específica (Tenant).
 * URI: GET /api/correcciones/empresa/{id_empresa}
 */
export const obtenerCorreccionesPorEmpresa = async (
  idEmpresa: string,
): Promise<IncidenciaResponse[]> => {
  const respuesta = await api.get<IncidenciaResponse[]>(
    `/api/correcciones/empresa/${idEmpresa}`,
  );
  return respuesta.data;
};
