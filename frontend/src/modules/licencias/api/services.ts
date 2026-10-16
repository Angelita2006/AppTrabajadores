import api from "@/src/service/api/api";
import {
  CicloFacturacion,
  EmitirLicencia,
  Licencia,
  LicenciaResponse,
  LicenciaUpdate,
  PlanLicencia,
} from "../types/licencia";

export interface PrecioPlanComercial {
  plan: PlanLicencia;
  ciclo: Exclude<CicloFacturacion, "Trial">;
  importe_menor_unidad: number | null;
  moneda: string;
  nombre_producto: string;
}

export interface CheckoutCompraRequest {
  email: string;
  plan: PlanLicencia;
  ciclo: Exclude<CicloFacturacion, "Trial">;
  clave_idempotencia: string;
}

/**
 * Obtiene importes y monedas de los precios activos configurados en Stripe.
 * URI: GET /api/licencias/planes/precios
 *
 * @async
 * @function obtenerPreciosComerciales
 * @returns {Promise<PrecioPlanComercial[]>} Precios disponibles para compra.
 * @throws {Error} Mensaje de la API o error genérico al consultar precios.
 */
export async function obtenerPreciosComerciales(): Promise<PrecioPlanComercial[]> {
  try {
    return (await api.get<PrecioPlanComercial[]>("/api/licencias/planes/precios")).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "No se pudieron obtener los precios de los planes.");
  }
}

/**
 * Solicita a la API una sesión segura de Stripe Checkout.
 * URI: POST /api/licencias/checkout
 *
 * @async
 * @function crearSesionCompra
 * @param {CheckoutCompraRequest} payload - Email, plan, ciclo e identificador idempotente.
 * @returns {Promise<{ url: string; session_id: string }>} URL alojada de pago.
 * @throws {Error} Mensaje de la API o error genérico al iniciar el pago.
 */
export async function crearSesionCompra(payload: CheckoutCompraRequest): Promise<{ url: string; session_id: string }> {
  try {
    return (await api.post<{ url: string; session_id: string }>("/api/licencias/checkout", payload)).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "No se pudo iniciar la compra.");
  }
}

/**
 * Confirma el pago con Stripe y recupera el código de licencia.
 * URI: GET /api/licencias/checkout/{session_id}
 *
 * @async
 * @function confirmarCompraCheckout
 * @param {string} sessionId - Identificador de la sesión de Stripe devuelto al completar el pago.
 * @returns {Promise<{ codigo: string; plan: PlanLicencia; ciclo: CicloFacturacion }>} Licencia emitida.
 * @throws {Error} Mensaje de la API o error genérico si el pago sigue pendiente.
 */
export async function confirmarCompraCheckout(sessionId: string): Promise<{ codigo: string; plan: PlanLicencia; ciclo: CicloFacturacion; fecha_inicio: string; fecha_expiracion: string }> {
  try {
    return (await api.get(`/api/licencias/checkout/${encodeURIComponent(sessionId)}`)).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "No se pudo confirmar la compra.");
  }
}

/**
 * Servicio de gestión de licencias.
 * Permite consultar, emitir, modificar y revocar licencias mediante la API.
 */

/**
 * Obtiene las licencias visibles para la cuenta autenticada.
 * URI: GET /api/licencias
 *
 * @async
 * @function obtenerLicencias
 * @returns {Promise<Licencia[]>} Lista de licencias.
 * @throws {Error} Lanza el mensaje de la API o un error genérico si falla la consulta.
 */
export async function obtenerLicencias(): Promise<Licencia[]> {
  try {
    return (await api.get<Licencia[]>("/api/licencias")).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener las licencias.");
  }
}

/**
 * Emite una licencia nueva.
 * URI: POST /api/licencias
 *
 * @async
 * @function emitirLicencia
 * @param {EmitirLicencia} payload - Plan, ciclo de facturación y vigencia.
 * @returns {Promise<Licencia>} Licencia emitida.
 * @throws {Error} Lanza el mensaje de la API o un error genérico si falla la emisión.
 */
export async function emitirLicencia(payload: EmitirLicencia): Promise<Licencia> {
  try {
    return (await api.post<Licencia>("/api/licencias", payload)).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al emitir la licencia.");
  }
}

/**
 * Obtiene una licencia por su identificador.
 * URI: GET /api/licencias/{id_licencia}
 *
 * @async
 * @function obtenerLicencia
 * @param {string} idLicencia - UUID de la licencia.
 * @returns {Promise<Licencia>} Licencia solicitada.
 * @throws {Error} Lanza el mensaje de la API o un error genérico si falla la consulta.
 */
export async function obtenerLicencia(idLicencia: string): Promise<LicenciaResponse> {
  try {
    return (await api.get<LicenciaResponse>(`/api/licencias/${idLicencia}`)).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al obtener la licencia.");
  }
}

/**
 * Modifica una licencia existente.
 * URI: PATCH /api/licencias/{id_licencia}
 *
 * @async
 * @function modificarLicencia
 * @param {string} idLicencia - UUID de la licencia.
 * @param {Partial<Licencia>} payload - Campos que se actualizarán.
 * @returns {Promise<Licencia>} Licencia actualizada.
 * @throws {Error} Lanza el mensaje de la API o un error genérico si falla la modificación.
 */
export async function modificarLicencia(idLicencia: string, payload: LicenciaUpdate): Promise<Licencia> {
  try {
    return (await api.patch<Licencia>(`/api/licencias/${idLicencia}`, payload)).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al modificar la licencia.");
  }
}

/**
 * Revoca una licencia conservando su registro para mantener trazabilidad.
 * URI: DELETE /api/licencias/{id_licencia}
 *
 * @async
 * @function revocarLicencia
 * @param {string} idLicencia - UUID de la licencia que se revocará.
 * @returns {Promise<Licencia>} Licencia revocada.
 * @throws {Error} Lanza el mensaje de la API o un error genérico si falla la revocación.
 */
export async function revocarLicencia(idLicencia: string): Promise<Licencia> {
  try {
    return (await api.delete<Licencia>(`/api/licencias/${idLicencia}`)).data;
  } catch (error: any) {
    const apiMessage = error?.response?.data?.detail || error?.response?.data?.message;
    throw new Error(apiMessage || "Error al revocar la licencia.");
  }
}
