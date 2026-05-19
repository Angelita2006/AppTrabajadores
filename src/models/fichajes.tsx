export interface Fichaje {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  tipo: "entrada" | "salida" | "descanso" | "horas_extra";
  fecha: number;
  fecha_hora: Date;
  //   ubicacion?: { lat: number; lng: number };
}
