import { Empresa } from "../models/empresas";
import { Trabajador } from "../models/trabajadores";
import api from "./api";

// @app.put("/trabajador/{idTrabajador}/empresas/{idEmpresa}")
// def agregar_empresa_a_trabajador(idTrabajador: int, idEmpresa: int):
//     db = get_db()
//     try:
//         trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
//         if not trabajador:
//             return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")

//         empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
//         if not empresa:
//             return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")

//         if empresa not in trabajador.empresas:
//             trabajador.empresas.append(empresa)
//         else:
//             return JSONResponse(status_code=404, content=f"El empresa ({empresa.id}) ya existe en la lista de empresas del trabajador {trabajador.nombre} {trabajador.apellidos}.")

//         db.commit()
//         db.refresh(trabajador)

//         return JSONResponse(status_code=201, content=jsonable_encoder(trabajador))

//     except OSError as error:
//         db.rollback()
//         return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

//     finally:
//         db.close()

export const agregarEmpresaTrabajador = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<void> => {
  try {
    await api.put(`/trabajador/${idTrabajador}/empresas/${idEmpresa}`);
  } catch (error) {
    console.error("Error al agregar la empresa al trabajador: ", error);
  }
};

// Función para obtener el fichaje de un trabajador en una empresa
export const getTrabajadoresEmpresa = async (
  idTrabajador: number,
  idEmpresa: number,
): Promise<Trabajador[]> => {
  try {
    const res = await api.get(`/empresas?/${idEmpresa}/trabajadores`);
    return res.data;
  } catch (error) {
    console.error("Error al obtener los trabajadores de la empresa: ", error);
    throw error;
  }
};

// Función para actualizar la información de un fichaje
export const updateEmpresa = async (idEmpresa: number): Promise<Empresa> => {
  try {
    const res = await api.put(`/empresas/${idEmpresa}`, {});
    return res.data;
  } catch (error) {
    console.error("Error al actualizar la empresa:", error);
    throw error;
  }
};

// Función para obtener todos los fichajes
export const getEmpresas = async (): Promise<Empresa[]> => {
  const res = await api.get("/empresas");
  return res.data;
};
