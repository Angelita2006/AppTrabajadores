import { create } from "axios";
import { Platform } from "react-native";

// 1. Detectamos la URL correcta según la plataforma
const getBaseURL = () => {
  if (Platform.OS === "web") {
    return "http://localhost:8080"; // Para el navegador web
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080"; // Para el emulador de Android
  }
  return "http://localhost:8080"; // Para iOS (emulador) u otros
};

const api = create({
  baseURL: getBaseURL(),
  timeout: 5000,
});

export default api;
