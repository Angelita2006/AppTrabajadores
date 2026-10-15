import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { AppColorScheme } from "@/src/constants/theme";

const STORAGE_KEY_TEMA = "@fichapp_preferencia_tema";

interface TemaState {
  tema: AppColorScheme;
  inicializado: boolean;
  inicializarTema: () => Promise<void>;
  establecerTema: (tema: AppColorScheme) => Promise<void>;
}

export const useTemaStore = create<TemaState>((set) => ({
  tema: "light",
  inicializado: false,

  inicializarTema: async () => {
    try {
      const temaGuardado = await AsyncStorage.getItem(STORAGE_KEY_TEMA);
      const tema: AppColorScheme = temaGuardado === "dark" ? "dark" : "light";
      set({ tema, inicializado: true });
    } catch (error) {
      console.error("No se pudo cargar la preferencia de tema:", error);
      set({ tema: "light", inicializado: true });
    }
  },

  establecerTema: async (tema) => {
    set({ tema });

    try {
      await AsyncStorage.setItem(STORAGE_KEY_TEMA, tema);
    } catch (error) {
      console.error("No se pudo guardar la preferencia de tema:", error);
    }
  },
}));
