// app/mobile/src/modules/trabajadores/store/SesionContext.tsx
import React, {
    createContext,
    ReactNode,
    useContext,
    useMemo,
    useState,
} from "react";
import { Trabajador, UsuarioSesion } from "../types/trabajador";

interface SesionContextValue {
  usuarioActual: UsuarioSesion | null;
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  trabajadorActual: Trabajador | null; // Propiedad calculada reactiva de alta comodidad
  empresaSeleccionada: any | null;
  setEmpresaSeleccionada: (empresa: any | null) => void;
  empresas: any[];
  setEmpresas: (empresas: any[]) => void;
  seleccionarEmpresa: (empresa: any | null) => void;
}

const SesionContext = createContext<SesionContextValue | undefined>(undefined);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<any | null>(
    null,
  );
  const [empresas, setEmpresas] = useState<any[]>([]);

  /**
   * Extrae de forma automática el expediente laboral anidado dentro de la cuenta del usuario.
   * Evita tener que actualizar manualmente múltiples estados a la vez en el Login.
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
    <SesionContext.Provider value={value}>{children}</SesionContext.Provider>
  );
}

export function useSesion() {
  const context = useContext(SesionContext);
  if (!context) {
    throw new Error("useSesion debe usarse dentro del ProveedorSesion");
  }
  return context;
}
