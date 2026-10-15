import api from "@/src/service/api/api";
import { UsuarioRol, UsuarioRolCreate } from "../types/usuario_rol";

/** Membresías de usuarios en empresas (la API ya no expone /usuarios-roles). */
export async function obtenerTodasLasAsignacionesDeRoles(
  idEmpresa: string,
): Promise<UsuarioRol[]> {
  const response = await api.get<UsuarioRol[]>(
    `/api/usuarios-empresas/empresa/${idEmpresa}`,
  );
  return response.data;
}

export async function obtenerRolPorUsuario(
  idUsuario: string,
): Promise<UsuarioRol[]> {
  const response = await api.get<UsuarioRol[]>(
    `/api/usuarios-empresas/usuario/${idUsuario}`,
  );
  return response.data;
}

export async function asignarRolUsuario(
  payload: UsuarioRolCreate,
): Promise<UsuarioRol> {
  const response = await api.post<UsuarioRol>("/api/usuarios-empresas", payload);
  return response.data;
}

/** idRelacion es el UUID de la membresía, no el del usuario. */
export async function cambiarRolAsignadoUsuario(
  idRelacion: string,
  idRol: string,
): Promise<UsuarioRol> {
  const response = await api.patch<UsuarioRol>(
    `/api/usuarios-empresas/${idRelacion}`,
    { rol_id: idRol },
  );
  return response.data;
}

export async function revocarRolUsuario(idRelacion: string): Promise<void> {
  await api.delete(`/api/usuarios-empresas/${idRelacion}`);
}
