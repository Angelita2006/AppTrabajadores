import axios from "axios";

/**
 * Cliente de Axios configurado para centralizar las peticiones HTTP de la app.
 */
const api = axios.create({
  // Dirección base del servidor (Backend)
  // "0.0.0.0" no funcionará dentro de un emulador de celular (Android/iOS), se cambiará
  // por una dirección IP privada (ej: "http://192.168.1.50:8000")
  baseURL: "http://0.0.0.0:8000",

  // Configuración de cabeceras estándar
  headers: {
    // Indica al servidor que toda la información se enviará en formato JSON
    "Content-Type": "application/json",
  },
});

export default api;
