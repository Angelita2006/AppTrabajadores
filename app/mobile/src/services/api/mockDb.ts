import { Empresa } from "../../modules/empresas/types/empresa";
import { Fichaje } from "../../modules/fichajes/types/fichaje";
import { Horario } from "../../modules/horarios/types/horario";
import {
  Estado,
  Trabajador,
} from "../../modules/trabajadores/types/trabajador";

export type Vacacion = {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  fechaInicio: string;
  fechaFin: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  motivo: string;
};

export type Incidencia = {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  tipo: "olvido_fichaje" | "ausencia" | "retraso" | "otro";
  fecha: string;
  estado: "abierta" | "en_revision" | "resuelta";
  descripcion: string;
};

// Almacena la fecha y hora exacta del momento actual
const today = new Date();

/**
 * Genera un objeto de fecha con el día de hoy, pero modificando la hora y los minutos.
 * Utiliza los segundos y milisegundos puestos a cero de forma exacta.
 *
 * @param hour - La hora del día en formato de 24 horas (ej: 14 para las 2:00 PM).
 * @param minute - Los minutos del reloj. Por defecto es 0 si no se indica.
 * @returns Un nuevo objeto Date con el tiempo exacto configurado.
 */
const atHour = (hour: number, minute = 0) => {
  // 1. Crea una copia limpia con el día, mes y año de hoy
  const date = new Date(today);

  // 2. Ajusta los parámetros: (horas, minutos, segundos, milisegundos)
  date.setHours(hour, minute, 0, 0);

  return date;
};

let trabajadores: Trabajador[] = [
  {
    id: 1,
    role: "admin",
    dni: "00000000A",
    nombre: "Ana",
    apellidos: "Martinez Lopez",
    direccion: "Calle Mayor 12",
    codigo_postal: "28013",
    poblacion: "Madrid",
    provincia: "Madrid",
    cuenta_cotizacion: "0111-2222-3333",
    puesto: "Responsable RRHH",
    estado: Estado.Activo,
    email: "admin@app.test",
    password: "admin123",
    empresas: [1, 2],
  },
  {
    id: 2,
    role: "user",
    dni: "11111111B",
    nombre: "Carlos",
    apellidos: "Garcia Ruiz",
    direccion: "Avenida Norte 8",
    codigo_postal: "28029",
    poblacion: "Madrid",
    provincia: "Madrid",
    cuenta_cotizacion: "0444-5555-6666",
    puesto: "Operario",
    estado: Estado.Trabajando,
    email: "carlos@app.test",
    password: "demo123",
    empresas: [1],
  },
  {
    id: 3,
    role: "user",
    dni: "22222222C",
    nombre: "Lucia",
    apellidos: "Santos Perez",
    direccion: "Calle Puerto 4",
    codigo_postal: "46001",
    poblacion: "Valencia",
    provincia: "Valencia",
    cuenta_cotizacion: "0777-8888-9999",
    puesto: "Administracion",
    estado: Estado.Activo,
    email: "lucia@app.test",
    password: "demo123",
    empresas: [2],
  },
];

let empresas: Empresa[] = [
  {
    id: 1,
    nombre: "Nova Servicios Integrales",
    cif: "B12345678",
    direccion: "Paseo de la Castellana 90",
    codigo_postal: "28046",
    poblacion: "Madrid",
    provincia: "Madrid",
    trabajadores: [1, 2],
  },
  {
    id: 2,
    nombre: "Levante Retail Group",
    cif: "B87654321",
    direccion: "Calle Colon 22",
    codigo_postal: "46004",
    poblacion: "Valencia",
    provincia: "Valencia",
    trabajadores: [1, 3],
  },
];

let fichajes: Fichaje[] = [
  {
    id: 1,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "entrada",
    fecha: atHour(8, 4).getTime(),
    fecha_hora: atHour(8, 4),
  },
  {
    id: 2,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "descanso",
    fecha: atHour(11, 32).getTime(),
    fecha_hora: atHour(11, 32),
  },
  {
    id: 3,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "fin_descanso",
    fecha: atHour(11, 51).getTime(),
    fecha_hora: atHour(11, 51),
  },
];

let horarios: Horario[] = [
  {
    id: 1,
    idTrabajador: 2,
    idEmpresa: 1,
    tipoJornada: "Jornada completa",
    dias: 5,
    diasSemana: "Lunes a viernes",
    hora_entrada1: atHour(8),
    hora_salida1: atHour(14),
    hora_entrada2: atHour(15),
    hora_salida2: atHour(17),
  },
  {
    id: 2,
    idTrabajador: 3,
    idEmpresa: 2,
    tipoJornada: "Jornada intensiva",
    dias: 5,
    diasSemana: "Lunes a viernes",
    hora_entrada1: atHour(7, 30),
    hora_salida1: atHour(15, 30),
  },
];

let vacaciones: Vacacion[] = [
  {
    id: 1,
    idTrabajador: 2,
    idEmpresa: 1,
    fechaInicio: "2026-07-15",
    fechaFin: "2026-07-26",
    estado: "aprobada",
    motivo: "Vacaciones de verano",
  },
  {
    id: 2,
    idTrabajador: 3,
    idEmpresa: 2,
    fechaInicio: "2026-08-03",
    fechaFin: "2026-08-09",
    estado: "pendiente",
    motivo: "Asuntos familiares",
  },
];

let incidencias: Incidencia[] = [
  {
    id: 1,
    idTrabajador: 2,
    idEmpresa: 1,
    tipo: "olvido_fichaje",
    fecha: "2026-06-13",
    estado: "en_revision",
    descripcion: "Olvido de fichaje de salida del viernes.",
  },
  {
    id: 2,
    idTrabajador: 3,
    idEmpresa: 2,
    tipo: "retraso",
    fecha: "2026-06-12",
    estado: "resuelta",
    descripcion: "Retraso por incidencia de transporte.",
  },
];
/**
 * Genera de forma automática el siguiente identificador (ID) numérico correlativo.
 * Busca el ID más alto dentro de la lista que recibe y le suma 1.
 *
 * @param items - Arreglo de objetos que contienen una propiedad numérica 'id'.
 * @returns El siguiente ID disponible (mínimo 1).
 */
const nextId = <T extends { id: number }>(items: T[]) =>
  Math.max(0, ...items.map((item) => item.id)) + 1;

/**
 * Base de datos simulada en memoria (Mock DB) para la gestión del sistema FICHAPP.
 * Todas las funciones emulan operaciones asíncronas utilizando promesas (async/await).
 */
export const mockDb = {
  // ==========================================
  // TRABAJADORES
  // ==========================================

  /**
   * Autentica a un usuario verificando su correo electrónico y contraseña.
   * No distingue entre mayúsculas y minúsculas en el email.
   */
  async login(email: string, password: string) {
    return (
      trabajadores.find(
        (trabajador) =>
          trabajador.email.toLowerCase() === email.toLowerCase() &&
          trabajador.password === password,
      ) ?? null
    );
  },

  /** Obtiene la lista completa con todos los trabajadores registrados. */
  async getTrabajadores() {
    return trabajadores;
  },

  /** Busca un trabajador específico por su identificador único. */
  async getTrabajador(id: number) {
    return trabajadores.find((trabajador) => trabajador.id === id) ?? null;
  },

  /** Registra un nuevo empleado asignándole automáticamente un ID consecutivo. */
  async createTrabajador(data: Omit<Trabajador, "id">) {
    const trabajador = { ...data, id: nextId(trabajadores) };
    trabajadores = [...trabajadores, trabajador];
    return trabajador;
  },

  /** Modifica los datos de un trabajador existente buscando por su ID. */
  async updateTrabajador(id: number, data: Partial<Trabajador>) {
    let updated: Trabajador | null = null;
    trabajadores = trabajadores.map((trabajador) => {
      // Si no coincide el ID o se intenta duplicar un DNI, mantiene los datos intactos
      if (trabajador.id !== id && trabajador.dni !== data.dni)
        return trabajador;
      updated = { ...trabajador, ...data };
      return updated;
    });
    return updated;
  },

  // ==========================================
  // EMPRESAS
  // ==========================================

  /** Obtiene la lista completa de todas las empresas de la plataforma. */
  async getEmpresas() {
    return empresas;
  },

  /** Busca una empresa específica por su identificador único. */
  async getEmpresa(id: number) {
    return empresas.find((empresa) => empresa.id === id) ?? null;
  },

  /**
   * Obtiene las empresas vinculadas a un trabajador.
   * Si el usuario tiene rol 'admin', devuelve todas las empresas disponibles.
   */
  async getEmpresasTrabajador(idTrabajador: number) {
    const trabajador = trabajadores.find((item) => item.id === idTrabajador);
    if (trabajador?.role === "admin") return empresas;
    return empresas.filter((empresa) =>
      empresa.trabajadores?.includes(idTrabajador),
    );
  },

  /** Crea una vinculación mutua de IDs entre un trabajador y una empresa sin duplicados. */
  async addEmpresaTrabajador(idTrabajador: number, idEmpresa: number) {
    // Agrega la empresa al perfil del trabajador
    trabajadores = trabajadores.map((trabajador) =>
      trabajador.id === idTrabajador
        ? {
            ...trabajador,
            empresas: Array.from(
              new Set([...(trabajador.empresas ?? []), idEmpresa]),
            ),
          }
        : trabajador,
    );
    // Agrega el trabajador al perfil de la empresa
    empresas = empresas.map((empresa) =>
      empresa.id === idEmpresa
        ? {
            ...empresa,
            trabajadores: Array.from(
              new Set([...(empresa.trabajadores ?? []), idTrabajador]),
            ),
          }
        : empresa,
    );
  },

  // ==========================================
  // FICHAJES
  // ==========================================

  /** Obtiene el historial global de fichajes registrados en la aplicación. */
  async getFichajes() {
    return fichajes;
  },

  /** Obtiene y ordena de forma cronológica los fichajes de un empleado en una empresa particular. */
  async getFichajesTrabajadorEmpresa(idTrabajador: number, idEmpresa: number) {
    return fichajes
      .filter(
        (fichaje) =>
          fichaje.idTrabajador === idTrabajador &&
          fichaje.idEmpresa === idEmpresa,
      )
      .sort((a, b) => a.fecha - b.fecha); // Ordena de más antiguo a más reciente
  },

  /** Registra un evento de fichaje (entrada/salida) capturando el momento exacto en tiempo real. */
  async createFichaje(
    idTrabajador: number,
    idEmpresa: number,
    tipo: Fichaje["tipo"],
  ) {
    const fechaHora = new Date();
    const fichaje: Fichaje = {
      id: nextId(fichajes),
      idTrabajador,
      idEmpresa,
      tipo,
      fecha: fechaHora.getTime(), // Almacena la marca de tiempo numérica (timestamp)
      fecha_hora: fechaHora, // Almacena el objeto Date original
    };
    fichajes = [...fichajes, fichaje];
    return fichaje;
  },

  // ==========================================
  // HORARIOS
  // ==========================================

  /** Obtiene la lista completa de horarios laborales configurados. */
  async getHorarios() {
    return horarios;
  },

  /** Obtiene el cuadrante de horario asignado a un trabajador en una empresa específica. */
  async getHorarioTrabajadorEmpresa(idTrabajador: number, idEmpresa: number) {
    return (
      horarios.find(
        (horario) =>
          horario.idTrabajador === idTrabajador &&
          horario.idEmpresa === idEmpresa,
      ) ?? null
    );
  },

  // ==========================================
  // VACACIONES
  // ==========================================

  /** Obtiene todas las solicitudes de vacaciones del sistema. */
  async getVacaciones() {
    return vacaciones;
  },

  /** Genera una nueva solicitud de vacaciones que se guarda inicialmente en estado 'pendiente'. */
  async createVacacion(data: Omit<Vacacion, "id" | "estado">) {
    const vacacion: Vacacion = {
      ...data,
      id: nextId(vacaciones),
      estado: "pendiente",
    };
    vacaciones = [...vacaciones, vacacion];
    return vacacion;
  },

  // ==========================================
  // INCIDENCIAS
  // ==========================================

  /** Obtiene el reporte total de incidencias registradas. */
  async getIncidencias() {
    return incidencias;
  },

  /** Registra un reporte de incidencia o problema asignándole por defecto el estado 'abierta'. */
  async createIncidencia(data: Omit<Incidencia, "id" | "estado">) {
    const incidencia: Incidencia = {
      ...data,
      id: nextId(incidencias),
      estado: "abierta",
    };
    incidencias = [...incidencias, incidencia];
    return incidencia;
  },
};
