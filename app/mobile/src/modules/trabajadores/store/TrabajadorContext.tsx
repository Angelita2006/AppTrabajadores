import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Empresa } from "../../../modules/empresas/types/empresa";
import { Trabajador } from "../../../modules/trabajadores/types/trabajador";
import { mockDb } from "../../../services/api/mockDb";

interface TrabajadorContextValue {
  trabajadorActual: Trabajador | null;
  setTrabajadorActual: (trabajador: Trabajador | null) => void;
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  seleccionarEmpresa: (empresa: Empresa | null) => void;
}

const TrabajadorContext = createContext<TrabajadorContextValue | undefined>(
  undefined,
);

export function ProveedorTrabajador({ children }: { children: ReactNode }) {
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      mockDb.getTrabajador(1),
      mockDb.getEmpresasTrabajador(1),
    ]).then(([trabajador, empresasIniciales]) => {
      if (!mounted) return;
      setTrabajadorActual(trabajador);
      setEmpresas(empresasIniciales);
      setEmpresaSeleccionada(empresasIniciales[0] ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      trabajadorActual,
      setTrabajadorActual,
      empresaSeleccionada,
      setEmpresaSeleccionada,
      empresas,
      setEmpresas,
      seleccionarEmpresa: setEmpresaSeleccionada,
    }),
    [trabajadorActual, empresaSeleccionada, empresas],
  );

  return (
    <TrabajadorContext.Provider value={value}>
      {children}
    </TrabajadorContext.Provider>
  );
}

export function useTrabajador() {
  const context = useContext(TrabajadorContext);

  if (!context) {
    throw new Error("useTrabajador debe usarse dentro de ProveedorTrabajador");
  }

  return context;
}
