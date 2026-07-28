import React, { createContext, useCallback, useContext, useState } from "react";
import { obtenerAsignacionesTurnoTrabajador } from "../../asignaciones-turno/api/services";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { obtenerContratosPorTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { obtenerTrabajadores } from "../../trabajadores/api/services";
import { Trabajador } from "../../trabajadores/types/trabajador";
import { obtenerTurnoPorId } from "../../turnos/api/services";

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
      const plantillaCompleta = await Promise.all(
        trabajadores.map(async (trabajador: Trabajador) => {
          try {
            const [contratos, asignaciones] = await Promise.all([
              obtenerContratosPorTrabajador(trabajador.id).catch(() => []),
              obtenerAsignacionesTurnoTrabajador(trabajador.id).catch(() => []),
            ]);

            const asignacionesConTurno = await Promise.all(
              asignaciones.map(async (asig: AsignacionTurno) => {
                const turnoDetalle = await obtenerTurnoPorId(asig.turno_id);
                return { ...asig, turno: turnoDetalle };
              }),
            );

            // Retornamos el objeto mapeado forzándolo o asegurando la estructura
            return {
              ...trabajador,
              contratos: contratos || [],
              contratoActivo:
                contratos?.find((c: Contrato) => c.activo === true) || null,
              asignacionesTurno: asignacionesConTurno,
            } as unknown as Trabajador;
          } catch (err) {
            console.error(`Error procesando trabajador ${trabajador.id}:`, err);
            return null;
          }
        }),
      );

      // Usamos type guard explícito que TypeScript respeta al 100%
      const plantillaFiltrada: Trabajador[] = plantillaCompleta.filter(
        (t): t is Trabajador => t !== null,
      );

      setPlantilla(plantillaFiltrada);
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
