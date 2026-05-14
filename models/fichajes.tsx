let idsFichajes = 0;

// datos de ejemplo de fichajes
const fichajes: Fichaje[] = [];

// modelo de Fichaje
export interface Fichaje {
  idFichaje: number;
  idTrabajador: number;
  idEmpresa: number;
  tipo: "entrada" | "salida" | "descanso" | "horas_extra";
  fecha: string; 
  fecha_hora: Date;
  //   ubicacion?: { lat: number; lng: number };
}

// Funciones para manejar los fichajes

// crea un nuevo fichaje
export const crearFichaje = (
  idTrabajador: number,
  idEmpresa: number,
  tipo: "entrada" | "salida" | "descanso" | "horas_extra",
): Fichaje => {
  const fichaje = {
    idFichaje: idsFichajes++,
    idTrabajador,
    idEmpresa,
    tipo,
    fecha: new Date().toISOString(),
    fecha_hora: new Date(),
  };
  fichajes.push(fichaje);

  return fichaje;
};

// obtiene los fichajes de un trabajador en una empresa específica
export const obtenerFichajes = (
  idTrabajador: number,
  idEmpresa: number,
): Fichaje[] => {
  return fichajes.filter(
    (f) => f.idTrabajador === idTrabajador && f.idEmpresa === idEmpresa,
  );
};
