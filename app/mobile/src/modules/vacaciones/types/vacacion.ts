export type Vacacion = {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  fechaInicio: string;
  fechaFin: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  motivo: string;
};
