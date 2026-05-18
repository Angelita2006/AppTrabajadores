import React, { createContext, ReactNode, useContext, useState } from "react";
import { Empresa } from "../src/empresas";
import { Trabajador } from "../src/trabajadores";

// Contexto para manejar el estado global del trabajador actual y la empresa seleccionada en la aplicación.
// Proporciona un proveedor de contexto (ProveedorTrabajador) que envuelve la aplicación y un hook personalizado (useTrabajador)
// para acceder a los valores del contexto desde cualquier componente hijo.
interface ContextoTrabajador {
  trabajadorActual: Trabajador | null;
  setTrabajadorActual: (trabajador: Trabajador | null) => void;
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresaId: Empresa | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
  seleccionarEmpresa: (empresaId: number) => void;
}

// Contexto creado con createContext, inicializado como undefined para indicar que no hay un valor predeterminado.
// Se espera que este contexto sea proporcionado por el ProveedorTrabajador en algún nivel superior de la jerarquía de componentes.
const ContextoTrabajadorConst = createContext<ContextoTrabajador | undefined>(
  undefined,
);

// ProveedorTrabajador se le pasa como prop el contenido de la aplicación (children) y
// se encarga de proporcionar el estado del trabajador actual y la empresa seleccionada a través del contexto.
export const ProveedorTrabajador: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]); // ✅ añadir estado

  const seleccionarEmpresa = (empresaId: number) => {
    const empresa = empresas.find((e) => e.id === empresaId) ?? null;
    setEmpresaSeleccionada(empresa); // ✅ siempre establece, nunca deselecciona
  };

  return (
    <ContextoTrabajadorConst.Provider
      value={{
        trabajadorActual,
        setTrabajadorActual,
        empresaSeleccionada,
        setEmpresaSeleccionada,
        setEmpresas,
        empresas,
        seleccionarEmpresa,
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
