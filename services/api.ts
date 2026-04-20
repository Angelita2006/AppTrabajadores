import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.56.1:8000/api", // Cambia esto a la URL de tu backend
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
