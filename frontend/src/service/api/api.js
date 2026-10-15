import { mostrarError } from "@/src/utils/errorHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web") {
    return "http://127.0.0.1:8080"; // Para local en navegador web
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080"; // Para local en emulador de Android
  }

  return "http://127.0.0.1:8080"; // Para local en otros dispositivos
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Variable en memoria global para acceso instantáneo
let memoryToken = "";
let memoryEmpresaId = "";

const EMPRESA_CONTEXT_KEY = "@fichapp_empresa_actual_id";

if (Platform.OS === "web" && typeof window !== "undefined") {
  try {
    memoryToken = localStorage.getItem("user_token") || "";
    if (memoryToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${memoryToken}`;
    }
  } catch (e) {
    console.error("Error leyendo token síncrono en web:", e);
  }
}

// Función para establecer el token desde fuera
export const setAuthToken = async (token) => {
  memoryToken = token || "";
  try {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        localStorage.setItem("user_token", token);
      } else {
        await AsyncStorage.setItem("user_token", token);
      }
    } else {
      delete api.defaults.headers.common["Authorization"];
      if (Platform.OS === "web" && typeof window !== "undefined") {
        localStorage.removeItem("user_token");
      } else {
        await AsyncStorage.removeItem("user_token");
      }
    }
  } catch (e) {
    mostrarError("Error al guardar/eliminar el token: " + e);
  }
};

// Función para inicializar el token al arrancar la app
export const loadAuthToken = async () => {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      memoryToken = localStorage.getItem("user_token") || "";
    } else {
      memoryToken = (await AsyncStorage.getItem("user_token")) || "";
    }

    if (memoryToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${memoryToken}`;
    }
  } catch (e) {
    mostrarError("Error cargando token inicial: " + e);
  }
};

/** Fija el tenant seleccionado. El backend vuelve a validar el acceso en cada petición. */
export const setEmpresaContext = async (empresaId) => {
  memoryEmpresaId = empresaId || "";
  try {
    if (memoryEmpresaId) {
      await AsyncStorage.setItem(EMPRESA_CONTEXT_KEY, memoryEmpresaId);
    } else {
      await AsyncStorage.removeItem(EMPRESA_CONTEXT_KEY);
    }
  } catch (error) {
    mostrarError("Error al guardar la empresa activa: " + error);
  }
};

api.interceptors.request.use(
  async (config) => {
    try {
      if (!memoryToken) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          memoryToken = localStorage.getItem("user_token") || "";
        } else {
          memoryToken = (await AsyncStorage.getItem("user_token")) || "";
        }
      }

      if (!memoryEmpresaId) {
        memoryEmpresaId = (await AsyncStorage.getItem(EMPRESA_CONTEXT_KEY)) || "";
      }

      if (memoryToken) {
        config.headers.set("Authorization", `Bearer ${memoryToken}`);
      }
      if (config.skipEmpresaContext) {
        config.headers.delete("Empresa-ID");
      } else if (memoryEmpresaId) {
        config.headers.set("Empresa-ID", memoryEmpresaId);
      } else {
        config.headers.delete("Empresa-ID");
      }
    } catch (error) {
      mostrarError("Error al recuperar el token: " + error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
