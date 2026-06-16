export type Incidencia = {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  tipo: "olvido_fichaje" | "ausencia" | "retraso" | "otro";
  fecha: string;
  estado: "abierta" | "en_revision" | "resuelta";
  descripcion: string;
};
