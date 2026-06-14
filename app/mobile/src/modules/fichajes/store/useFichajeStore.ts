import { create } from "zustand";
import {
  crearFichaje,
  obtenerFichajesEmpresaTrabajador,
} from "@/modules/fichajes/api/fichajesService";

export type EstadoFichaje = "fuera" | "trabajando" | "descanso";

interface FichajeStore {
  trabajadorId: number;
  empresaId: number;
  fichajeHoy: any[];
  estadoActual: EstadoFichaje;
  ultimoFichaje: any | null;

  setTrabajador: (id: number) => void;
  setEmpresa: (id: number) => Promise<void>;
  cargarFichajesToday: () => Promise<void>;
  calcularEstado: () => EstadoFichaje;
  registrarFichaje: (
    tipo: "entrada" | "salida" | "descanso" | "fin_descanso",
  ) => Promise<void>;
  resetStore: () => void;
}

export const useFichajeStore = create<FichajeStore>((set, get) => ({
  trabajadorId: 0,
  empresaId: 0,
  fichajeHoy: [],
  estadoActual: "fuera",
  ultimoFichaje: null,

  setTrabajador: (id: number) => set({ trabajadorId: id }),

  setEmpresa: async (id: number) => {
    set({ empresaId: id });
    await get().cargarFichajesToday();
  },

  cargarFichajesToday: async () => {
    const { trabajadorId, empresaId } = get();
    if (!trabajadorId || !empresaId) return;

    try {
      const fichajes = await obtenerFichajesEmpresaTrabajador(
        trabajadorId,
        empresaId,
      );
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fichajeHoy = fichajes.filter(
        (f) => new Date(f.fecha_hora).setHours(0, 0, 0, 0) === hoy.getTime(),
      );

      set({ fichajeHoy });
      const estado = get().calcularEstado();
      set({ estadoActual: estado });
    } catch (error) {
      console.error("Error cargando fichajes:", error);
    }
  },

  calcularEstado: (): EstadoFichaje => {
    const { fichajeHoy } = get();
    if (fichajeHoy.length === 0) return "fuera";

    const ultimo = fichajeHoy[fichajeHoy.length - 1];

    if (ultimo.tipo === "entrada") return "trabajando";
    if (ultimo.tipo === "descanso") return "descanso";
    if (ultimo.tipo === "fin_descanso") return "trabajando";
    if (ultimo.tipo === "salida") return "fuera";

    return "fuera";
  },

  registrarFichaje: async (tipo) => {
    const { trabajadorId, empresaId } = get();
    if (!trabajadorId || !empresaId) return;

    try {
      await crearFichaje(trabajadorId, empresaId, tipo);
      await get().cargarFichajesToday();
    } catch (error) {
      console.error("Error registrando fichaje:", error);
    }
  },

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
