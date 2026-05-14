import { create } from 'zustand';
import { obtenerFichajes } from '@/models/fichajes';

export type EstadoFichaje = 'fuera' | 'trabajando' | 'descanso';

interface FichajeStore {
  // Estado
  trabajadorId: number;
  empresaId: number;
  fichajeHoy: any[];
  estadoActual: EstadoFichaje;
  ultimoFichaje: any | null;

  // Acciones
  setTrabajador: (id: number) => void;
  setEmpresa: (id: number) => void;
  cargarFichajesToday: () => void;
  calcularEstado: () => EstadoFichaje;
  registrarFichaje: (tipo: 'entrada' | 'salida' | 'descanso' | 'fin_descanso') => void;
}

export const useFichajeStore = create<FichajeStore>((set, get) => ({
  trabajadorId: 0,
  empresaId: 0,
  fichajeHoy: [],
  estadoActual: 'fuera',
  ultimoFichaje: null,

  setTrabajador: (id: number) => set({ trabajadorId: id }),

  setEmpresa: (id: number) => {
    set({ empresaId: id });
    get().cargarFichajesToday();
  },

  cargarFichajesToday: () => {
    const { trabajadorId, empresaId } = get();
    if (!trabajadorId || !empresaId) return;

    try {
      const fichajes = obtenerFichajes(trabajadorId, empresaId);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fichajeHoy = fichajes.filter(
        (f) => new Date(f.fecha_hora).setHours(0, 0, 0, 0) === hoy.getTime()
      );

      set({ fichajeHoy });
      const estado = get().calcularEstado();
      set({ estadoActual: estado });
    } catch (error) {
      console.error('Error cargando fichajes:', error);
    }
  },

  calcularEstado: (): EstadoFichaje => {
    const { fichajeHoy } = get();
    if (fichajeHoy.length === 0) return 'fuera';

    const ultimo = fichajeHoy[fichajeHoy.length - 1];

    if (ultimo.tipo === 'entrada') return 'trabajando';
    if (ultimo.tipo === 'descanso') return 'descanso';
    if (ultimo.tipo === 'fin_descanso') return 'trabajando';
    if (ultimo.tipo === 'salida') return 'fuera';

    return 'fuera';
  },

  registrarFichaje: (tipo) => {
    const { fichajeHoy } = get();
    // Placeholder - la lógica de registro irá aquí
    get().cargarFichajesToday();
  },
}));
