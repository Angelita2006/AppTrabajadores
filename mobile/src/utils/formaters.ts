import { TipoEventoFichaje } from "../modules/tipos_eventos_fichaje/types/tipos_evento_fichaje";

/**
 * Formatea un objeto Date a una cadena estándar con formato YYYY-MM-DD
 * ideal para consultas seguras en APIs o bases de datos.
 *
 * @param date - Objeto Date a formatear.
 * @returns Cadena de texto con la fecha en formato YYYY-MM-DD.
 */
export const formatearFecha = (date: Date): string => {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export const formatearAHorasYMinutos = (minutosTotales: number): string => {
  const hrs = Math.floor(minutosTotales / 60);
  const mins = minutosTotales % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

export const extraerHora = (
  fechaHoraStr: string,
  incluirSegundos = false,
): string => {
  if (!fechaHoraStr) return "00:00";
  const parteHora = fechaHoraStr.includes(" ")
    ? fechaHoraStr.split(" ")[1]
    : fechaHoraStr.split("T")[1];
  if (!parteHora) return "00:00";
  return incluirSegundos
    ? parteHora.substring(0, 8)
    : parteHora.substring(0, 5);
};

export const horaAMinutos = (horaStr: string): number => {
  if (!horaStr) return 0;
  const [h, m] = horaStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const obtenerMinutosFichaje = (fechaHoraIso: string): number => {
  const partes = fechaHoraIso.split("T");
  if (!partes[1]) return 0;
  const horaLimpia = partes[1].substring(0, 5);
  return horaAMinutos(horaLimpia);
};

export const obtenerConfiguracionEvento = (
  tipoEvento?: TipoEventoFichaje | null,
) => {
  if (!tipoEvento || !tipoEvento.codigo) {
    return { icono: "clock-outline", color: "#475569", texto: "DESCONOCIDO" };
  }
  const tipoStr = tipoEvento.codigo.trim().toUpperCase();
  if (tipoStr === "ENTRADA") {
    return { icono: "door-open", color: "#16A34A", texto: "ENTRADA" };
  } else if (tipoStr === "SALIDA") {
    return { icono: "exit-run", color: "#DC2626", texto: "SALIDA" };
  } else if (tipoStr === "INICIO_PAUSA" || tipoStr === "INICIO PAUSA") {
    return { icono: "coffee-to-go", color: "#EA580C", texto: "INICIO PAUSA" };
  } else if (tipoStr === "FIN_PAUSA" || tipoStr === "FIN PAUSA") {
    return { icono: "briefcase-check", color: "#2563EB", texto: "FIN PAUSA" };
  }
  return { icono: "clock-outline", color: "#475569", texto: tipoStr };
};

export const capitalizar = (texto: string) => {
  if (!texto) return "N/A";
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};
