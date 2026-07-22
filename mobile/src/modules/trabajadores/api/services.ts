import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../service/api/api";
import {
  AusenciaCreateRequest,
  AusenciaResponse,
  EstadoAusencia,
} from "../../ausencias/types/ausencia";
import {
  CalendarioFestivo,
  CalendarioLaboralCreate,
  CalendarioLaboralResponse,
  CalendarioLaboralUpdate,
} from "../../calendarios-laborales/types/calendario";
import {
  CentroTrabajo,
  CentroTrabajoCreate,
  CentroTrabajoUpdate,
} from "../../centros-trabajo/types/centro-trabajo";
import { Contrato } from "../../contratos/types/contrato";
import {
  IncidenciaCreateRequest,
  IncidenciaResponse,
} from "../../correcciones-fichaje/types/incidencia";
import { Departamento } from "../../departamentos/types/departamento";
import {
  Empresa,
  RegistroOrganizacionDTO,
  RespuestaRegistroCompleto,
} from "../../empresas/types/empresa";
import {
  Festivo,
  FestivoCreate,
  FestivoUpdate,
} from "../../festivos/types/festivo";
import { RegistroFichaje } from "../../fichajes/types/registrofichaje";
import { TurnoCreate } from "../../turnos/types/turno";
import { Trabajador, UsuarioSesion } from "../types/trabajador";

// ====================================================================
// 1. ENDPOINTS DE AUTENTICACIÓN Y EXPENDIENTE (TABLA TRABAJADORES)
// ====================================================================

/**
 * Valida el correo y la contraseña contra la base de datos de producción y almacena el token JWT.
 * @param email Correo electrónico
 * @param password Contraseña en texto plano
 */
export const getUsuarioByEmailYPassword = async (
  email: string,
  password: string,
): Promise<UsuarioSesion> => {
  const respuesta = await api.post("/api/usuarios/login", {
    email,
    password,
  });

  // Almacenamiento seguro del token JWT devuelto por el backend
  if (respuesta.data?.access_token) {
    await AsyncStorage.setItem("userToken", respuesta.data.access_token);

    // Inyectamos de inmediato el token en la instancia global de Axios
    // para evitar fallos de sincronización en peticiones subsiguientes realizadas en el mismo flujo
    api.defaults.headers.common["Authorization"] =
      `Bearer ${respuesta.data.access_token}`;
  }

  // Devolvemos el objeto de sesión (mapeando la estructura devuelta por el backend)
  return respuesta.data.usuario || respuesta.data;
};

/**
 * Recupera la información del usuario asociado a un trabajador específico.
 * URI: GET /api/usuarios/trabajador/{idTrabajador}
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const getUsuarioByIdTrabajador = async (
  idTrabajador: string,
): Promise<UsuarioSesion> => {
  try {
    const respuesta = await api.get(`/api/usuarios/trabajador/${idTrabajador}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Error al recuperar la cuenta de usuario vinculada al trabajador.",
    );
  }
};

/**
 * Recupera la información del usuario asociado a un trabajador específico.
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const getUsuarioById = async (
  idUsuario: string,
): Promise<UsuarioSesion> => {
  const respuesta = await api.get(`/api/usuarios/${idUsuario}`);
  return respuesta.data;
};

/**
 * Obtiene la plantilla completa de empleados registrados en el sistema Saas aplicando aislamiento multi-tenant.
 * URI: GET /api/trabajadores
 */
export const obtenerTrabajadores = async () => {
  try {
    const respuesta = await api.get("/api/trabajadores");
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar la plantilla de empleados del sistema.",
    );
  }
};

/**
 * Recupera la información detallada de un trabajador específico mediante su UUID.
 * URI: GET /api/trabajadores/{idTrabajador}
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const obtenerTrabajador = async (idTrabajador: string) => {
  try {
    const token = await AsyncStorage.getItem("userToken");

    if (!token) {
      throw new Error("Not authenticated");
    }

    const respuesta = await api.get(`/api/trabajadores/${idTrabajador}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail || error.message;
    throw new Error(
      apiMessage === "Not authenticated"
        ? "Not authenticated"
        : apiMessage || "Error al recuperar los detalles del trabajador.",
    );
  }
};

/**
 * Consulta la organización o empresa principal asignada al expediente del empleado.
 * URI: GET /api/trabajadores/{idTrabajador}/empresas
 * @param idTrabajador Identificador único de tipo UUID (string)
 */
export const obtenerEmpresasTrabajador = async (
  idTrabajador: string,
): Promise<Empresa[]> => {
  try {
    // Verificamos y obtenemos el token de forma explícita para evitar fallos de sincronización
    const token = await AsyncStorage.getItem("userToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const respuesta = await api.get<Empresa[]>(
      `/api/trabajadores/${idTrabajador}/empresas`,
      { headers },
    );
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar la empresa vinculada al trabajador.",
    );
  }
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
  metodo_fichaje: "App_móvil" | "Web";
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

export const obtenerFichajesTurnoActual = async (
  idTrabajador: string,
): Promise<RegistroFichaje[]> => {
  const respuesta = await api.get(
    `/api/fichajes/trabajador/${idTrabajador}/turno`,
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
 * Transmite una nueva petición de días libres o baja hacia la tabla 'ausencias' de PostgreSQL.
 * URI: POST /api/ausencias
 */
export const asignarAusenciaOVacaciones = async (
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
  nuevoEstado: "Aprobada" | "Rechazada",
  resolutorUsuarioId: string,
): Promise<IncidenciaResponse> => {
  const respuesta = await api.put<IncidenciaResponse>(
    `/api/correcciones/${idCorreccion}/resolver`,
    null,
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

/**
 * Obtiene la lista de centros de trabajo vinculados a una empresa específica.
 * URI del backend: GET /api/centros-trabajo/empresa/{id_empresa}
 * * @param idEmpresa Identificador único UUID de la empresa
 * @returns Promesa con el array de CentrosTrabajo
 */
export const obtenerCentrosPorEmpresa = async (
  idEmpresa: string,
): Promise<CentroTrabajo[]> => {
  try {
    const respuesta = await api.get<CentroTrabajo[]>(
      `/api/centros-trabajo/empresa/${idEmpresa}`,
    );
    return respuesta.data;
  } catch (error: any) {
    console.error(
      `Error al recuperar centros de trabajo de la empresa ${idEmpresa}:`,
      error,
    );
    throw error;
  }
};

/**
 * Recupera el turno con ese id.
 * URI: GET /api/turnos/{id_turno}
 */
export const obtenerTurno = async (idTurno: string) => {
  try {
    const respuesta = await api.get(`/api/turnos/${idTurno}`);
    return respuesta.data;
  } catch (error) {
    console.error(`Error al obtener turno ${idTurno}:`, error);
    throw error;
  }
};

/**
 * [ALTA SISTEMA] Registra en cadena una nueva Empresa, su primer expediente de Trabajador
 * y la cuenta de UsuarioSesion (con rol admin_empresa) vinculada.
 */
export const registrarOrganizacionCompleta = async (
  datos: RegistroOrganizacionDTO,
): Promise<RespuestaRegistroCompleto> => {
  try {
    // 1. POST /api/empresas -> Crear Organización Primaria
    const responseEmpresa = await api.post<Empresa>("/api/empresas", {
      nombre_comercial: datos.nombre_comercial,
      razon_social: datos.razon_social || datos.nombre_comercial,
      cif: datos.cif,
      zona_horaria: "Europe/Madrid", // Parámetro estándar de localización
      configuracion: {},
      codigo_cnae: null,
      convenio_colectivo: null,
      direccion_fiscal: null,
    });

    const empresaCreada = responseEmpresa.data;

    // 2. POST /api/trabajadores -> Crear Expediente Laboral Asociado
    // Utilizamos la misma función interna o mapeamos la estructura requerida por tu backend
    const responseTrabajador = await api.post("/api/trabajadores", {
      empresa_id: empresaCreada.id,
      nif_nie: datos.cif, // Provisionalmente vinculamos el CIF de empresa como NIF del gestor
      nombre: datos.nombre_admin || "Admin",
      apellidos: datos.apellidos_admin || datos.nombre_comercial,
      email: datos.email,
      telefono: null,
      numero_seguridad_social: null,
      fecha_nacimiento: null,
    });

    const trabajadorCreado = responseTrabajador.data;

    // 3. POST /api/usuarios -> Generar Credenciales y Cuenta de Acceso de Plataforma
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
    // Extrae y propaga de manera limpia la excepción controlada de FastAPI (HTTPException)
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage ||
        "Ha ocurrido un error inesperado al procesar el alta de organización.",
    );
  }
};

/**
 * Registra un nuevo empleado en la base de datos (Tabla: /api/trabajadores)
 * Comprueba el aislamiento de identidad por empresa.
 * URI: POST /api/trabajadores
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
 * Registra un nuevo contrato laboral asociándolo al expediente del empleado.
 * URI: POST /api/contratos
 */
export const crearContrato = async (data: {
  trabajador_id: string;
  empresa_id: string;
  centro_trabajo_id: string;
  tipo_contrato: string;
  tipo_jornada: string;
  horas_semana: number;
  fecha_inicio: string; // Formato AAAA-MM-DD
  departamento_id?: string | null;
  puesto_trabajo?: string | null;
  categoria_profesional?: string | null;
  fecha_fin?: string | null; // Formato AAAA-MM-DD
}) => {
  const respuesta = await api.post("/api/contratos", data);
  return respuesta.data;
};

/**
 * Vincula a un trabajador con un turno teórico fijando su fecha de inicio de vigencia.
 * URI: POST /api/asignaciones-turno
 */
export const asignarTurnoTrabajador = async (data: {
  trabajador_id: string;
  turno_id: string;
  fecha_inicio: string; // Formato AAAA-MM-DD
  fecha_fin?: string | null; // Formato AAAA-MM-DD
}) => {
  const respuesta = await api.post("/api/asignaciones-turno", data);
  return respuesta.data;
};

/**
 * Registra un nuevo cuadrante de turno teórico validando los datos con Pydantic.
 * URI: POST /api/turnos
 */
export const crearTurnoLaboral = async (datosTurno: TurnoCreate) => {
  const respuesta = await api.post("/api/turnos", {
    empresa_id: datosTurno.empresa_id,
    nombre: datosTurno.nombre,
    hora_inicio: datosTurno.hora_inicio,
    hora_fin: datosTurno.hora_fin,
    duracion_pausa_minutos: datosTurno.duracion_pausa_minutos || 0,
    dias_semana: datosTurno.dias_semana || [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
  });
  return respuesta.data;
};

/**
 * Recupera los cuadrantes horarios dados de alta de forma aislada por una organización (tenant).
 * URI: GET /api/turnos/empresa/{idEmpresa}
 * @param idEmpresa Identificador único de la empresa de tipo UUID (string)
 */
export const obtenerTurnosEmpresa = async (idEmpresa: string) => {
  try {
    const respuesta = await api.get(`/api/turnos/empresa/${idEmpresa}`);
    return respuesta.data;
  } catch (error: any) {
    const apiMessage = error.response?.data?.detail;
    throw new Error(
      apiMessage || "Error al recuperar los turnos de la empresa.",
    );
  }
};

/**
 * Registra un nuevo centro de trabajo (PostgreSQL)
 * URI: POST /api/centros-trabajo
 */
export const crearCentroTrabajo = async (datosCentro: CentroTrabajoCreate) => {
  const respuesta = await api.post("/api/centros-trabajo", datosCentro);
  return respuesta.data;
};

/**
 * Recupera la lista de centros de trabajo asociados a una empresa específica.
 * URI: GET /api/centros-trabajo/empresa/{id_empresa}
 * @param idEmpresa Identificador único UUID de la empresa
 * @returns Promesa con el array de CentrosTrabajo
 */
export const guardarDatosEmpresa = async (
  empresaId: string,
  nueva_razon_social: string,
  nuevo_convenio: string,
  nuevo_cnae: string,
  nueva_direccion: string,
) => {
  const respuesta = await api.put(`/api/empresas/${empresaId}`, {
    nueva_razon_social,
    nuevo_convenio,
    nuevo_cnae,
    nueva_direccion,
  });
  return respuesta.data;
};

/**
 * Recupera los calendarios anuales de una empresa junto con el listado de sus días festivos.
 * @param empresaId UUID de la empresa seleccionada
 */
export const obtenerCalendarioYFestivos = async (
  empresaId: string,
): Promise<CalendarioFestivo[]> => {
  try {
    const respuesta = await api.get(
      `/api/calendarios-laborales/empresa/${empresaId}/con-festivos`,
    );
    return respuesta.data;
  } catch (error) {
    console.error("Error en obtenerCalendarioYFestivos service:", error);
    throw error;
  }
};

/**
 * Recupera los calendarios anuales de una empresa junto con el listado de sus días festivos.
 * @param empresaId UUID de la empresa seleccionada
 */
export const obtenerCalendario = async (
  calendarioId: string,
): Promise<CalendarioFestivo> => {
  try {
    const respuesta = await api.get(
      `/api/calendarios-laborales/${calendarioId}`,
    );
    return respuesta.data;
  } catch (error) {
    console.error("Error en obtenerCalendario service:", error);
    throw error;
  }
};

/**
 * Obtiene el historial de contratos de un trabajador específico.
 */
export const obtenerContratosPorTrabajador = async (idTrabajador: string) => {
  const respuesta = await api.get(`/api/contratos/trabajador/${idTrabajador}`);
  return respuesta.data;
};

/**
 * Obtiene las asignaciones de turno de un trabajador específico.
 */
export const obtenerAsignacionesPorTrabajador = async (
  idTrabajador: string,
) => {
  const respuesta = await api.get(
    `/api/asignaciones-turno/trabajador/${idTrabajador}`,
  );
  return respuesta.data;
};

/**
 * Obtiene los detalles maestros de un turno mediante su ID.
 */
export const obtenerTurnoPorId = async (idTurno: string) => {
  const respuesta = await api.get(`/api/turnos/${idTurno}`);
  return respuesta.data;
};

/**
 * Asigna múltiples turnos a un trabajador específico de forma masiva.
 * @param trabajadorId ID del trabajador
 * @param idsTurnos Arreglo con los IDs de los turnos seleccionados
 * @param fechaInicio Fecha de inicio de la asignación (formato AAAA-MM-DD)
 * @param fechaFin Fecha de fin opcional (formato AAAA-MM-DD o null)
 */
export const asignarTurnosTrabajador = async (
  trabajadorId: string,
  idsTurnos: string[],
  fechaInicio: string,
  fechaFin: string | null = null,
): Promise<any> => {
  try {
    const response = await api.post("/api/asignaciones-turno/masiva", {
      trabajador_id: trabajadorId,
      turnos_ids: idsTurnos,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    });

    return response.data;
  } catch (error) {
    console.error("Error en asignarTurnosTrabajador (Masiva):", error);
    throw error;
  }
};

export const obtenerAusenciasYVacacionesEmpresa = async (idEmpresa: string) => {
  const respuesta = await api.get(`/api/ausencias/empresa/${idEmpresa}`);
  return respuesta.data;
};

/**
 * Elimina todas las asignaciones de turno de un trabajador.
 * @param trabajadorId ID del trabajador
 */
export const eliminarTodasAsignacionesTrabajador = async (
  trabajadorId: string | number,
): Promise<any> => {
  try {
    const response = await api.delete(
      `/api/asignaciones-turno/trabajador/${trabajadorId}/eliminar-todas`,
    );
    return response.data;
  } catch (error) {
    console.error("Error en eliminarTodasAsignacionesTrabajador:", error);
    throw error;
  }
};

/**
 * Envía una petición PUT para actualizar el estado de una ausencia específica.
 * @param ausenciaId UUID de la solicitud de ausencia.
 * @param nuevoEstado El estado de tipo EstadoAusencia (pendiente, aprobado, rechazado).
 */
export const actualizarEstadoAusencia = async (
  ausenciaId: string,
  nuevoEstado: EstadoAusencia,
): Promise<AusenciaResponse> => {
  const url = `/api/ausencias/${ausenciaId}/estado?nuevo_estado=${nuevoEstado}`;

  try {
    const respuesta = await api.put<AusenciaResponse>(url);
    return respuesta.data;
  } catch (error) {
    console.error(
      `Error en actualizarEstadoAusencia para el ID ${ausenciaId}:`,
      error,
    );
    throw error;
  }
};

/**
 * Registra un nuevo calendario laboral en el sistema.
 * URI: POST /api/calendarios-laborales
 */
export const crearCalendarioLaboral = async (
  payload: CalendarioLaboralCreate,
): Promise<CalendarioLaboralResponse> => {
  try {
    // Reemplaza 'clienteApi' por la instancia de Axios/Fetch que use tu proyecto (ej: api.post)
    const respuesta = await api.post<CalendarioLaboralResponse>(
      "/api/calendarios-laborales",
      payload,
    );
    return respuesta.data;
  } catch (error) {
    console.error("Error en crearCalendarioLaboral:", error);
    throw error;
  }
};

/**
 * Actualiza las propiedades básicas de un calendario laboral (Año, Nombre, Centro).
 * URI: PUT /api/calendarios-laborales/{id_calendario}
 */
export const modificarCalendarioLaboral = async (
  idCalendario: string,
  payload: CalendarioLaboralUpdate,
): Promise<CalendarioLaboralResponse> => {
  try {
    const respuesta = await api.put<CalendarioLaboralResponse>(
      `/api/calendarios-laborales/${idCalendario}`,
      payload,
    );
    return respuesta.data;
  } catch (error) {
    console.error(
      `Error en modificarCalendarioLaboral para ID ${idCalendario}:`,
      error,
    );
    throw error;
  }
};

/**
 * Elimina físicamente un calendario laboral de la base de datos por su ID único.
 * Al eliminarse, la base de datos borrará en cascada todos los días festivos asociados.
 * URI: DELETE /api/calendarios-laborales/{id_calendario}
 *
 * @param idCalendario UUID único del calendario que se desea eliminar.
 */
export const eliminarCalendarioLaboral = async (
  idCalendario: string,
): Promise<void> => {
  try {
    // Reemplaza 'clienteApi' por la instancia de Axios o Fetch configurada en tu app (ej: api.delete)
    await api.delete(`/api/calendarios-laborales/${idCalendario}`);
  } catch (error) {
    console.error(
      `Error en el servicio eliminarCalendarioLaboral para ID ${idCalendario}:`,
      error,
    );
    throw error;
  }
};

/**
 * Registra un nuevo día festivo en el backend.
 * POST /api/festivos
 */
export const crearFestivo = async (
  payload: FestivoCreate,
): Promise<Festivo> => {
  try {
    const response = await api.post<Festivo>("/api/festivos", payload);
    return response.data;
  } catch (error) {
    console.error("Error al crear festivo en el servidor:", error);
    throw error;
  }
};

/**
 * Modifica un festivo existente mediante Query Params (según la firma de tu endpoint en FastAPI).
 * PUT /api/festivos/{id_festivo}/editar
 */
export const editarFestivo = async (
  idFestivo: string,
  params: FestivoUpdate,
): Promise<Festivo> => {
  try {
    // Como tu endpoint recibe parámetros opcionales sueltos (Query Params),
    // los mapeamos usando el objeto `params` de Axios.
    const response = await api.put<Festivo>(
      `/api/festivos/${idFestivo}/editar`,
      null,
      {
        params: {
          nueva_fecha: params.nueva_fecha,
          nuevo_tipo: params.nuevo_tipo,
          nueva_descripcion: params.nueva_descripcion,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error al editar festivo ${idFestivo} en el servidor:`,
      error,
    );
    throw error;
  }
};

/**
 * Elimina un día festivo del calendario.
 * DELETE /api/festivos/{id_festivo}
 */
export const eliminarFestivo = async (
  idFestivo: string,
): Promise<{ detail: string }> => {
  try {
    const response = await api.delete<{ detail: string }>(
      `/api/festivos/${idFestivo}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar festivo ${idFestivo}:`, error);
    throw error;
  }
};

/**
 * Envía un archivo binario PDF al servidor para ser analizado mediante IA (Gemini)
 * y persistir automáticamente los días festivos detectados en el calendario indicado.
 * * URI: POST /api/calendarios-laborales/calendarios/{calendarioId}/importar-pdf
 * @param calendarioId Identificador único UUID del calendario laboral de destino
 * @param formData Objeto FormData que contiene el archivo bajo la clave 'file'
 */
export const importarCalendarioPDF = async (
  calendarioId: string,
  formData: FormData,
): Promise<{
  status: string;
  total_importados: number;
  festivos: Festivo[];
}> => {
  try {
    const respuesta = await api.post(
      `/api/calendarios-laborales/calendarios/${calendarioId}/importar-pdf`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 45000,
      },
    );
    return respuesta.data;
  } catch (error) {
    console.error(`Error en servicio importarCalendarioPDF con Axios:`, error);
    throw error;
  }
};

/**
 * Recupera el contrato activo de un empleado blindado por el ID de la empresa seleccionada.
 * URI: GET /api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo
 * * @param idTrabajador UUID del empleado
 * @param idEmpresa UUID de la empresa activa en la sesión (Tenant)
 */
export const obtenerContratoActivoTrabajador = async (
  idTrabajador: string,
  idEmpresa: string,
): Promise<Contrato | null> => {
  try {
    const respuesta = await api.get<Contrato>(
      `/api/contratos/trabajador/${idTrabajador}/empresa/${idEmpresa}/activo`,
    );
    return respuesta.data || null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.warn(
        `El trabajador no tiene un contrato activo hoy en esta empresa.`,
      );
      return null;
    }
    console.error(
      `Error al obtener contrato activo (Trabajador: ${idTrabajador}, Empresa: ${idEmpresa}):`,
      error,
    );
    throw error;
  }
};

/**
 * Elimina el contrato activo de un empleado blindado por el ID de la empresa seleccionada.
 * URI: GET /api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo
 * * @param idTrabajador UUID del empleado
 * @param idEmpresa UUID de la empresa activa en la sesión (Tenant)
 */
export const rescindirContratoActivoTrabajador = async (
  idTrabajador: string,
  idEmpresa: string,
) => {
  try {
    const contrato: Contrato | null = await obtenerContratoActivoTrabajador(
      idTrabajador,
      idEmpresa,
    );
    let respuesta = null;
    if (contrato !== null)
      respuesta = await api.put(
        `/api/contratos/${contrato.id}/dar-baja?fecha_fin=${new Date().toISOString().split("T")[0]}`,
      );
    if (respuesta !== null) return respuesta.data;
    return null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.warn(
        `El trabajador no tiene un contrato activo hoy en esta empresa.`,
      );
      return null;
    }
    console.error(
      `Error al obtener contrato activo (Trabajador: ${idTrabajador}, Empresa: ${idEmpresa}):`,
      error,
    );
    throw error;
  }
};

// Obtener departamentos de una empresa específica
export const obtenerDepartamentosEmpresa = async (
  idEmpresa: string,
): Promise<Departamento[]> => {
  const response = await api.get(`/api/departamentos/empresa/${idEmpresa}`);
  return response.data;
};

// Crear un nuevo departamento
export const crearDepartamento = async (data: {
  empresa_id: string;
  nombre: string;
  centro_trabajo_id?: string | null;
}): Promise<Departamento> => {
  const response = await api.post(`/api/departamentos`, data);
  return response.data;
};

// Obtener un departamento por su ID
export const obtenerDepartamentoPorId = async (
  idDepartamento: string,
): Promise<Departamento> => {
  const response = await api.get(`/api/departamentos/${idDepartamento}`);
  return response.data;
};

// Actualizar un departamento
export const actualizarDepartamento = async (
  idDepartamento: string,
  nuevoNombre: string,
): Promise<Departamento> => {
  // Nota: Tu API espera el nuevo_nombre como query param o body,
  // basándome en tu código: /api/departamentos/{id}?nuevo_nombre=...
  const response = await api.put(
    `/api/departamentos/${idDepartamento}?nuevo_nombre=${encodeURIComponent(nuevoNombre)}`,
  );
  return response.data;
};

/**
 * [VISTA DE CONTROL] Actualiza los datos de un contrato existente.
 * URI: PUT /api/contratos/{id_contrato}
 * @param idContrato UUID del contrato a editar
 * @param datos Objeto con los campos a modificar (parcial o total)
 */
export const actualizarContratoActivoTrabajador = async (
  idContrato: string,
  datos: {
    empresa_id: string;
    centro_trabajo_id: string;
    tipo_contrato: string;
    tipo_jornada: string;
    horas_semana: number;
    fecha_inicio: string;
    fecha_fin: string;
    departamento_id: string;
    puesto_trabajo: string;
    categoria_profesional: string;
    trabajador_id: string;
  },
): Promise<Contrato> => {
  try {
    const respuesta = await api.put<Contrato>(
      `/api/contratos/${idContrato}`,
      datos,
    );
    return respuesta.data;
  } catch (error: any) {
    console.error(`Error al actualizar el contrato ${idContrato}:`, error);
    throw error;
  }
};

/**
 * Actualiza los datos de un centro de trabajo existente.
 * URI: PUT /api/centros-trabajo/{id_centro}/editar
 * @param idCentro UUID del centro de trabajo a modificar
 * @param datos Objeto parcial con los campos a actualizar
 */
export const editarCentroTrabajo = async (
  idCentro: string,
  datos: CentroTrabajoUpdate,
): Promise<CentroTrabajo> => {
  try {
    const respuesta = await api.put<CentroTrabajo>(
      `/api/centros-trabajo/${idCentro}/editar`,
      datos,
    );
    return respuesta.data;
  } catch (error) {
    console.error(`Error al editar el centro de trabajo ${idCentro}:`, error);
    throw error;
  }
};

/**
 * Elimina un centro de trabajo de la base de datos.
 * @param centroId - UUID del centro a eliminar.
 * @throws Error si el centro no existe o tiene restricciones de integridad.
 */
export const eliminarCentroTrabajo = async (
  centroId: string,
): Promise<void> => {
  try {
    // La ruta coincide con la definición de tu endpoint en FastAPI
    await api.delete(`/api/centros-trabajo/${centroId}`);

    return;
  } catch (error: any) {
    console.error(`Error al eliminar el centro ${centroId}:`, error);

    throw error;
  }
};

/**
 * Modifica las propiedades de un turno existente.
 * URI: PUT /api/turnos/{id_turno}/editar
 */
export const editarTurno = async (
  id_turno: string,
  data: any,
): Promise<any> => {
  try {
    const response = await api.put(`/api/turnos/${id_turno}/editar`, data);
    return response.data;
  } catch (error) {
    console.error(`Error al editar el turno ${id_turno}:`, error);
    throw error;
  }
};

/**
 * Elimina un turno físicamente de la base de datos (con efecto cascada).
 * URI: DELETE /api/turnos/{id_turno}
 */
export const eliminarTurno = async (
  id_turno: string,
): Promise<{ detail: string }> => {
  try {
    const response = await api.delete(`/api/turnos/${id_turno}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar el turno ${id_turno}:`, error);
    throw error;
  }
};

/**
 * Modifica las propiedades de un departamento existente.
 * URI: PUT /api/departamentos/{id_departamento}/editar
 * @param id_departamento - El ID del departamento a modificar.
 * @param data - Objeto con los campos a actualizar (nombre, centro_trabajo_id).
 */
export const editarDepartamento = async (
  id_departamento: string,
  data: { nombre?: string; centro_trabajo_id?: string },
): Promise<any> => {
  try {
    // La ruta coincide con la definición del endpoint en FastAPI
    const response = await api.put(
      `/api/departamentos/${id_departamento}/editar`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error(`Error al editar el departamento ${id_departamento}:`, error);
    throw error;
  }
};

/**
 * Elimina un departamento de la base de datos.
 * URI: DELETE /api/departamentos/{id_departamento}
 * @param id_departamento - El ID del departamento a eliminar.
 */
export const eliminarDepartamento = async (
  id_departamento: string,
): Promise<void> => {
  try {
    await api.delete(`/api/departamentos/${id_departamento}`);
    return;
  } catch (error) {
    console.error(
      `Error al eliminar el departamento ${id_departamento}:`,
      error,
    );
    throw error;
  }
};

export const actualizarTrabajador = async (
  idTrabajador: string,
  datos: Partial<Trabajador>,
) => {
  try {
    const response = await api.patch(
      `/api/trabajadores/${idTrabajador}`,
      datos,
    );
    return response.data;
  } catch (error) {
    console.error("Error al actualizar el trabajador:", error);
    throw error;
  }
};

export const registrarUsuarioAcceso = async (data: {
  empresa_cif: string;
  nif_nie: string;
  email: string;
  password: string;
}) => {
  const respuesta = await api.post("/api/usuarios/registro", data);
  return respuesta.data;
};
