import { create } from "axios";

const api = create({
  baseURL: "http://10.0.2.2:8080",
  timeout: 5000,
});

export default api;
