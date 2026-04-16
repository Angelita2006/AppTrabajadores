import { Empresa, Trabajador } from "@/components/models/types";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface ContextoTrabajador {
  trabajadorActual: Trabajador | null;
  setTrabajadorActual: (trabajador: Trabajador | null) => void;
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
}

const ContextoTrabajadorConst = createContext<ContextoTrabajador | undefined>(
  undefined,
);

export const ProveedorTrabajador: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);

  return (
    <ContextoTrabajadorConst.Provider
      value={{
        trabajadorActual,
        setTrabajadorActual,
        empresaSeleccionada,
        setEmpresaSeleccionada,
      }}
    >
      {children}
    </ContextoTrabajadorConst.Provider>
  );
};

export const useTrabajador = () => {
  const context = useContext(ContextoTrabajadorConst);
  if (!context) {
    throw new Error(
      "useTrabajador debe usarse dentro de un ProveedorTrabajador",
    );
  }
  return context;
};
