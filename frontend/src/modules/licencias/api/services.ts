import api from "@/src/service/api/api";
import { EmitirLicencia, Licencia } from "../types/licencia";

export async function obtenerLicencias(): Promise<Licencia[]> {
  const response = await api.get<Licencia[]>("/api/licencias");
  return response.data;
}

export async function emitirLicencia(payload: EmitirLicencia): Promise<Licencia> {
  const response = await api.post<Licencia>("/api/licencias", payload);
  return response.data;
}

export async function revocarLicencia(id: string): Promise<Licencia> {
  const response = await api.delete<Licencia>(`/api/licencias/${id}`);
  return response.data;
}
