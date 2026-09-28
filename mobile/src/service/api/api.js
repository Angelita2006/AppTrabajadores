import { mostrarError } from "@/src/utils/errorHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";

const getBaseURL = () => {
  // if (Platform.OS === "web") {
  //   return "http://127.0.0.1:8080"; // Para el navegador web
  // }
  // if (Platform.OS === "android") {
  //   return "http://10.0.2.2:8080"; // Para el emulador de Android
  // }

  // return "http://127.0.0.1:8080"; // Para iOS (emulador) u otros

  // URL de producción (dominio en servidor Plesk)
  return "https://www.registrohorariosimple.es";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Variable en memoria global para acceso instantáneo
let memoryToken = "";

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

      if (memoryToken) {
        config.headers.set("Authorization", `Bearer ${memoryToken}`);
      }
    } catch (error) {
      mostrarError("Error al recuperar el token: " + error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
