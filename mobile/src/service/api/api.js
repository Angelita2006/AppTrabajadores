import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const getBaseURL = () => {
  return "https://registrohorariosimple.es";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Variable en memoria global para acceso instantáneo
let memoryToken = "";

// Función para establecer el token desde fuera (ej: tras hacer login)
export const setAuthToken = async (token) => {
  memoryToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    await AsyncStorage.removeItem("user_token");
  }
};

// Función para inicializar el token al arrancar la app
export const loadAuthToken = async () => {
  try {
    memoryToken = await AsyncStorage.getItem("user_token");
  } catch (e) {
    console.error("Error cargando token inicial", e);
  }
};

api.interceptors.request.use(
  async (config) => {
    try {
      if (!memoryToken) {
        memoryToken = await AsyncStorage.getItem("user_token");
      }

      if (memoryToken) {
        config.headers.set("Authorization", `Bearer ${memoryToken}`);
      }
    } catch (error) {
      console.error("Error al recuperar el token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
