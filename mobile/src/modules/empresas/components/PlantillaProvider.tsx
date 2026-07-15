import React, { createContext, useCallback, useContext, useState } from "react";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";
import {
  obtenerAsignacionesPorTrabajador,
  obtenerContratosPorTrabajador,
  obtenerTrabajadores,
  obtenerTurnoPorId,
} from "../../trabajadores/api/services";
import { Trabajador } from "../../trabajadores/types/trabajador";

const PlantillaContext = createContext<any>(null);

export const PlantillaProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(false);
  const [inicializado, setInicializado] = useState(false);

  const cargarPlantilla = useCallback(async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const trabajadores = await obtenerTrabajadores();
      const plantillaCompleta: Trabajador[] = [];

      // Procesamos uno a uno o en grupos pequeños para no saturar la red
      for (const trabajador of trabajadores) {
        try {
          // Obtenemos contratos y asignaciones
          const [contratos, asignaciones] = await Promise.all([
            obtenerContratosPorTrabajador(trabajador.id).catch(() => []),
            obtenerAsignacionesPorTrabajador(trabajador.id).catch(() => []),
          ]);

          // Mapeamos los turnos con detalle
          const asignacionesConTurno = await Promise.all(
            asignaciones.map(async (asig: AsignacionTurno) => {
              const turnoDetalle = await obtenerTurnoPorId(asig.turno_id).catch(
                () => null,
              );
              return { ...asig, turno: turnoDetalle };
            }),
          );

          plantillaCompleta.push({
            ...trabajador,
            contratos: contratos || [],
            contratoActivo:
              contratos?.find((c: Contrato) => c.activo === true) || null,
            asignacionesTurno: asignacionesConTurno,
          });
        } catch (err) {
          console.error(`Error procesando trabajador ${trabajador.id}:`, err);
        }
      }

      setPlantilla(plantillaCompleta);
      setInicializado(true);
    } catch (e) {
      console.error("Error crítico de carga:", e);
    } finally {
      setCargando(false);
    }
  }, [cargando]);

  return (
    <PlantillaContext.Provider
      value={{ plantilla, cargando, cargarPlantilla, inicializado }}
    >
      {children}
    </PlantillaContext.Provider>
  );
};

export const usePlantilla = () => useContext(PlantillaContext);
