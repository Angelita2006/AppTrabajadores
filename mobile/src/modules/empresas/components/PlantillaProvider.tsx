import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import React, { createContext, useCallback, useContext, useState } from "react";
import { obtenerAsignacionesTurnoTrabajador } from "../../asignaciones-turno/api/services";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { obtenerContratosPorTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { obtenerTrabajadores } from "../../trabajadores/api/services";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { obtenerTurnoPorId } from "../../turnos/api/services";
import { useSesion } from "../../usuarios/store/SesionContextZustand";

/**
 * Interfaz que define los valores y métodos expuestos por el contexto de la plantilla de personal.
 */
interface PlantillaContextType {
  /** Listado completo de trabajadores con sus contratos y turnos enriquecidos. */
  plantilla: Trabajador[];
  /** Indicador booleano que señala si se está realizando una operación de carga o sincronización. */
  cargando: boolean;
  /** Función asíncrona para cargar o refrescar los datos de la plantilla de la empresa seleccionada. */
  cargarPlantilla: () => Promise<void>;
  /** Indicador booleano que determina si el contexto ya ha completado su carga inicial. */
  inicializado: boolean;
}

/**
 * Contexto global de React para la gestión y distribución de la plantilla de personal de la organización.
 */
const PlantillaContext = createContext<PlantillaContextType | null>(null);

/**
 * Proveedor del Contexto de Plantilla. Envuelve los componentes hijos para suministrar
 * el estado y las funciones de sincronización de trabajadores, contratos y asignaciones de turnos.
 *
 * @component
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos que consumirán el contexto.
 */
export const PlantillaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { empresaActual } = useSesion();
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [inicializado, setInicializado] = useState<boolean>(false);
  const { mostrarError, mostrarMensaje } = useAppModal();

  /**
   * Carga de forma asíncrona la plantilla completa de trabajadores vinculados a la empresa seleccionada,
   * enriqueciendo cada registro con sus contratos, contrato activo y asignaciones de turnos con detalle.
   */
  const cargarPlantilla = useCallback(async (): Promise<void> => {
    if (!empresaActual?.id) {
      mostrarMensaje("Alerta", "No se ha seleccionado ninguna empresa activa.");
      return;
    }
    setCargando(true);
    try {
      const trabajadores: Trabajador[] = await obtenerTrabajadores(
        empresaActual.id,
      ).catch((error: any) => {
        throw new Error(
          "Error al obtener la lista de trabajadores de la empresa: " +
            obtenerMensajeAmigableError(error.message),
        );
      });

      const plantillaCompleta = await Promise.all(
        trabajadores.map(
          async (trabajador: Trabajador): Promise<Trabajador | null> => {
            try {
              const [contratos, asignaciones] = await Promise.all([
                obtenerContratosPorTrabajador(trabajador.id).catch(
                  (error: any) => {
                    mostrarError(
                      `Error al obtener los contratos del trabajador ${trabajador.id}: ` +
                        obtenerMensajeAmigableError(error.message),
                    );
                    return [] as Contrato[];
                  },
                ),
                obtenerAsignacionesTurnoTrabajador(trabajador.id).catch(
                  (error: any) => {
                    mostrarError(
                      `Error al obtener las asignaciones de turno del trabajador ${trabajador.id}: ` +
                        obtenerMensajeAmigableError(error.message),
                    );
                    return [] as AsignacionTurno[];
                  },
                ),
              ]);

              const asignacionesConTurno = await Promise.all(
                asignaciones.map(async (asig: AsignacionTurno) => {
                  try {
                    const turnoDetalle = await obtenerTurnoPorId(asig.turno_id);
                    return { ...asig, turno: turnoDetalle };
                  } catch (error: any) {
                    mostrarError(
                      `Error al obtener el detalle del turno ${asig.turno_id}: ` +
                        obtenerMensajeAmigableError(error.message),
                    );
                    return { ...asig, turno: null };
                  }
                }),
              );

              return {
                ...trabajador,
                contratos: contratos || [],
                contratoActivo:
                  contratos?.find((c: Contrato) => c.activo === true) || null,
                turnosAsignadosVigentes: asignacionesConTurno,
              } as unknown as Trabajador;
            } catch (error: any) {
              mostrarError(
                `Error procesando la información del trabajador ${trabajador.id}: ` +
                  obtenerMensajeAmigableError(error.message),
              );
              return null;
            }
          },
        ),
      );

      const plantillaFiltrada: Trabajador[] = plantillaCompleta.filter(
        (t): t is Trabajador => t !== null,
      );

      setPlantilla(plantillaFiltrada);
      setInicializado(true);
    } catch (error: any) {
      mostrarError(
        "Error crítico de carga y sincronización de la plantilla de personal: " +
          obtenerMensajeAmigableError(error.message),
      );
    } finally {
      setCargando(false);
    }
  }, [empresaActual?.id]);

  return (
    <PlantillaContext.Provider
      value={{ plantilla, cargando, cargarPlantilla, inicializado }}
    >
      {children}
    </PlantillaContext.Provider>
  );
};

/**
 * Hook personalizado para consumir de manera segura el contexto de la plantilla de personal.
 *
 * @returns {PlantillaContextType} Objeto con el estado y los métodos del contexto de plantilla.
 * @throws {Error} Lanza un error si se intenta utilizar fuera de un {@link PlantillaProvider}.
 */
export const usePlantilla = (): PlantillaContextType => {
  const contexto = useContext(PlantillaContext);
  if (!contexto) {
    throw new Error(
      "usePlantilla debe ser utilizado dentro de un PlantillaProvider.",
    );
  }
  return contexto;
};
