export interface Horario {
  id: number;
  idTrabajador: number;
  idEmpresa: number;
  tipoJornada: string;
  dias: number;
  diasSemana: string;
  hora_entrada1: Date;
  hora_salida1: Date;
  hora_entrada2?: Date;
  hora_salida2?: Date;
}
