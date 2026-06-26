import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Empresa } from "../../empresas/types/empresa";
import { obtenerTrabajador } from "../api/services";
import { Trabajador, UsuarioSesion } from "../types/trabajador";

interface SesionContextValue {
  usuarioActual: UsuarioSesion | null;
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  trabajadorActual: Trabajador | null;
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  seleccionarEmpresa: (empresa: Empresa | null) => void;
}

const SesionContext = createContext<SesionContextValue | undefined>(undefined);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  // 2. Convertimos trabajadorActual en un estado de TypeScript correcto
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );

  // 3. Usamos useEffect para resolver de forma asíncrona la petición de la API
  useEffect(() => {
    async function cargarExpediente() {
      // Si el usuario cierra sesión, limpiamos el expediente del trabajador
      if (!usuarioActual || !usuarioActual.trabajador_id) {
        setTrabajadorActual(null);
        return;
      }

      try {
        // Esperamos a la API de forma segura
        const datosTrabajador = await obtenerTrabajador(
          usuarioActual.trabajador_id,
        );
        setTrabajadorActual(datosTrabajador);
      } catch (error) {
        console.error("Error al obtener los datos del trabajador:", error);
        setTrabajadorActual(null);
      }
    }

    cargarExpediente();
  }, [usuarioActual]); // Se ejecuta automáticamente cada vez que el usuario inicia o cierra sesión

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
