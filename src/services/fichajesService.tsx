export * from "../DBservices/fichajesService";

export const getFichajeTrabajadorEmpresa = (
  idFichaje: number,
  idTrabajador: number,
  idEmpresa: number,
): Fichaje | null => {
  const fichajesTrabajadorEmpresa = obtenerFichajesEmpresaTrabajador(
    idTrabajador,
    idEmpresa,
  );

  if (fichajesTrabajadorEmpresa.length === 0) {
    return null;
  }
  const fichaje = fichajesTrabajadorEmpresa.find((f) => f.id === idFichaje);

  return fichaje || null;
};
