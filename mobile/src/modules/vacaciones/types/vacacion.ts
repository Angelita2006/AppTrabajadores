export type Vacacion = {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  fechaInicio: string;
  fechaFin: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
  motivo: string;
};
