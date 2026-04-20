let idsFichajes = 0;

// datos de ejemplo de fichajes
const fichajes: Fichaje[] = [];

// modelo de Fichaje
export interface Fichaje {
  id: number;
  idTrabajador: number;
  idEmpresa?: number;
  tipo: "entrada" | "salida" | "descanso" | "horas_extra";
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
    id: idsFichajes++,
    idTrabajador,
    idEmpresa,
    tipo,
    fecha_hora: new Date(),
  };
  fichajes.push(fichaje);

  try {
    fetch("/api/fichajes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fichaje),
    });
  } catch (error) {
    console.error("Error al enviar el fichaje al backend:", error);
  }
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
