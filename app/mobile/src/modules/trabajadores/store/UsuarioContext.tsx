// app/mobile/src/modules/trabajadores/store/TrabajadorContext.tsx

import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { Empresa } from "../../empresas/types/empresa";
import { Trabajador, UsuarioSesion } from "../types/trabajador";

interface UsuarioContextValue {
  usuarioActual: UsuarioSesion | null;
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  trabajadorActual: Trabajador | null; // Mantenido como propiedad calculada por compatibilidad
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  seleccionarEmpresa: (empresa: Empresa | null) => void;
}

const UsuarioContext = createContext<UsuarioContextValue | undefined>(
  undefined,
);

export function ProveedorTrabajador({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  /**
   * Abstracción de compatibilidad UX:
   * Extrae de forma reactiva el expediente del operario incrustado dentro de la cuenta.
   */
  const trabajadorActual = useMemo(() => {
    return usuarioActual?.trabajador ?? null;
  }, [usuarioActual]);

  const value = useMemo(
    () => ({
      usuarioActual,
      setUsuarioActual,
      trabajadorActual,
      empresaSeleccionada,
      setEmpresaSeleccionada,
      empresas,
      setEmpresas,
      seleccionarEmpresa: setEmpresaSeleccionada,
    }),
    [usuarioActual, trabajadorActual, empresaSeleccionada, empresas],
  );

  return (
    <UsuarioContext.Provider value={value}>{children}</UsuarioContext.Provider>
  );
}

export function useTrabajador() {
  const context = useContext(UsuarioContext);
  if (!context) {
    throw new Error("useTrabajador debe usarse dentro de ProveedorTrabajador");
  }
  return context;
}
