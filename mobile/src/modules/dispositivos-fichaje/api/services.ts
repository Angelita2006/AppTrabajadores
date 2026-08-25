import api from "@/src/service/api/api";
import {
  Dispositivo,
  DispositivoCreate,
  DispositivoUpdate,
} from "../types/dispositivo-fichaje";

export const obtenerDispositivosEmpresa = async (
  empresaId: string,
): Promise<Dispositivo[]> => {
  const response = await api.get(`/api/dispositivos/empresa/${empresaId}`);
  return response.data;
};

export const obtenerDispositivosCentro = async (
  centroId: string,
): Promise<Dispositivo[]> => {
  const response = await api.get(`/api/dispositivos/centro/${centroId}`);
  return response.data;
};

export const crearDispositivo = async (
  payload: DispositivoCreate,
): Promise<Dispositivo> => {
  const response = await api.post("/api/dispositivos", payload);
  return response.data;
};

export const editarDispositivo = async (
  dispositivoId: string,
  payload: DispositivoUpdate,
): Promise<Dispositivo> => {
  const response = await api.put(`/api/dispositivos/${dispositivoId}`, payload);
  return response.data;
};

export const eliminarDispositivo = async (
  dispositivoId: string,
): Promise<void> => {
  await api.delete(`/api/dispositivos/${dispositivoId}`);
};
