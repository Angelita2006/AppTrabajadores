import { create } from "zustand";
// import {
//   crearFichaje,
//   obtenerFichajesEmpresaTrabajador,
// } from "../../../modules/fichajes/api/fichajesService";
import {
  crearFichaje,
  obtenerFichajesEmpresaTrabajador,
} from "../../../modules/fichajes/api/services";

/**
 * Define las tres variantes posibles en las que se puede encontrar la jornada de un empleado.
 */
export type EstadoFichaje = "fuera" | "trabajando" | "descanso";

/**
 * Interfaz que define la estructura de datos y las funciones del estado global de fichajes.
 */
interface FichajeStore {
  // Identificador del empleado activo en la sesión de marcaje
  trabajadorId: number;
  // Identificador de la organización donde se realiza el registro
  empresaId: number;
  // Lista de marcajes realizados exclusivamente durante el día en curso
  fichajeHoy: any[];
  // Estado operativo actual del trabajador derivado de sus marcajes
  estadoActual: EstadoFichaje;
  // Almacena el último evento de fichaje guardado en el sistema
  ultimoFichaje: any | null;

  // Guarda el ID del trabajador en el estado global
  setTrabajador: (id: number) => void;
  // Configura la empresa activa e inicia de forma automática la carga de marcajes del día
  setEmpresa: (id: number) => Promise<void>;
  // Consulta el historial de marcajes y filtra únicamente los que pertenecen al día de hoy
  cargarFichajesToday: () => Promise<void>;
  // Evalúa el último marcaje del día para determinar la situación laboral del usuario
  calcularEstado: () => EstadoFichaje;
  // Guarda un nuevo evento de marcaje en el sistema y refresca el estado en tiempo real
  registrarFichaje: (
    tipo: "entrada" | "salida" | "descanso" | "fin_descanso",
  ) => Promise<void>;
  // Limpia por completo todas las variables restaurando los valores de fábrica
  resetStore: () => void;
}

/**
 * Almacén global (Store) de Zustand para centralizar la lógica del registro horario de FICHAPP.
 * Controla de forma reactiva si el empleado está trabajando, descansando o fuera de su turno.
 */
export const useFichajeStore = create<FichajeStore>((set, get) => ({
  // Valores iniciales de fábrica por defecto
  trabajadorId: 0,
  empresaId: 0,
  fichajeHoy: [],
  estadoActual: "fuera",
  ultimoFichaje: null,

  // Asigna el identificador del empleado seleccionado
  setTrabajador: (id: number) => set({ trabajadorId: id }),

  // Configura la empresa activa y dispara la sincronización horaria de inmediato
  setEmpresa: async (id: number) => {
    set({ empresaId: id });
    await get().cargarFichajesToday();
  },

  // Busca y filtra cronológicamente todos los marcajes del empleado en el día actual
  cargarFichajesToday: async () => {
    const { trabajadorId, empresaId } = get();
    // Cancela el proceso si no constan los datos de registro mínimos obligatorios
    if (!trabajadorId || !empresaId) return;

    try {
      // Consulta el historial total de marcajes vinculados a este perfil
      const fichajes = await obtenerFichajesEmpresaTrabajador(
        trabajadorId,
        empresaId,
      );

      // Obtiene la marca de tiempo exacta del inicio del día de hoy (00:00:00)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Filtra de forma matemática descartando los fichajes de jornadas pasadas
      const fichajeHoy = fichajes.filter(
        (f: { fecha_hora: string | number | Date }) =>
          new Date(f.fecha_hora).setHours(0, 0, 0, 0) === hoy.getTime(),
      );

      // Actualiza la lista del día en curso y recalcula el estado derivado
      set({ fichajeHoy });
      const estado = get().calcularEstado();
      set({ estadoActual: estado });
    } catch (error) {
      console.error("Error cargando fichajes:", error);
    }
  },

  // Máquina de estados que decide la situación del empleado analizando su último marcaje
  calcularEstado: (): EstadoFichaje => {
    const { fichajeHoy } = get();
    // Si el usuario no ha realizado ninguna acción hoy, por defecto está fuera de su jornada
    if (fichajeHoy.length === 0) return "fuera";

    // Extrae el último marcaje registrado en la cola del día
    const ultimo = fichajeHoy[fichajeHoy.length - 1];

    // Evalúa la clave del evento y asigna el estado correspondiente
    if (ultimo.tipo === "entrada") return "trabajando";
    if (ultimo.tipo === "descanso") return "descanso";
    if (ultimo.tipo === "fin_descanso") return "trabajando";
    if (ultimo.tipo === "salida") return "fuera";

    return "fuera"; // Respaldo de seguridad
  },

  // Inserta de forma asíncrona un nuevo marcaje e inicia un ciclo de recarga automático
  registrarFichaje: async (tipo) => {
    const { trabajadorId, empresaId } = get();
    if (!trabajadorId || !empresaId) return;

    try {
      // Guarda de forma persistente el marcaje en la simulación de base de datos
      await crearFichaje(trabajadorId, empresaId, tipo);
      // Sincroniza la lista diaria para recalcular los botones de la pantalla principal
      await get().cargarFichajesToday();
    } catch (error) {
      console.error("Error registrando fichaje:", error);
    }
  },

  // Restaura el almacén global limpiando la memoria del dispositivo, ideal para el cierre de sesión
  resetStore: () => {
    set({
      trabajadorId: 0,
      empresaId: 0,
      fichajeHoy: [],
      estadoActual: "fuera",
      ultimoFichaje: null,
    });
  },
}));
