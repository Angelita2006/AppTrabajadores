import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { Empresa } from "../../empresas/types/empresa";
// Importamos el nuevo tipo compuesto que creamos en el paso anterior
import { Trabajador, UsuarioSesion } from "../types/trabajador";

/**
 * Interfaz que define el molde de datos del contexto de sesión unificado.
 */
interface TrabajadorContextValue {
  // Objeto central con la cuenta de usuario conectada y su token/perfil, o null si no hay sesión
  usuarioActual: UsuarioSesion | null;
  // Función para modificar o guardar la sesión completa del usuario conectado
  setUsuarioActual: (usuario: UsuarioSesion | null) => void;
  // Atributo calculado directo: extrae el expediente del trabajador anidado en la sesión
  trabajadorActual: Trabajador | null;
  // Objeto con los datos de la empresa con la que se está operando activamente en la sesión
  empresaSeleccionada: Empresa | null;
  // Función básica para actualizar o cambiar directamente la empresa activa en memoria
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  // Lista completa de todas las empresas que tiene asignadas el trabajador actual
  empresas: Empresa[];
  // Función para inicializar o actualizar el arreglo de empresas disponibles
  setEmpresas: (empresas: Empresa[]) => void;
  // Función alternativa creada para cambiar la empresa seleccionada de forma explícita
  seleccionarEmpresa: (empresa: Empresa | null) => void;
}

// Crea el contenedor del contexto global inicializado de forma segura como indefinido
const TrabajadorContext = createContext<TrabajadorContextValue | undefined>(
  undefined,
);

/**
 * Componente proveedor que envuelve la aplicación y distribuye los estados globales.
 * Administra de forma centralizada la información del usuario de producción y sus empresas.
 */
export function ProveedorTrabajador({ children }: { children: ReactNode }) {
  // 🚀 CAMBIO DE LÓGICA CLAVE: Centralizamos el estado en la cuenta de usuario de la base de datos
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(
    null,
  );

  // Estado para rastrear con qué empresa se están revisando los turnos y vacaciones
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  // Estado para almacenar el listado de las organizaciones vinculadas al empleado
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  /**
   * 🚀 PROPIEDAD CALCULADA DINÁMICA:
   * Extrae automáticamente el expediente de trabajador que viene dentro de la cuenta del usuario.
   * Evita tener que sincronizar dos estados diferentes a la vez de forma manual.
   */
  const trabajadorActual = useMemo(() => {
    return usuarioActual?.trabajador ?? null;
  }, [usuarioActual]);

  // Almacena de forma optimizada en memoria el objeto de datos globales para evitar renderizados innecesarios
  const value = useMemo(
    () => ({
      usuarioActual,
      setUsuarioActual,
      trabajadorActual, // Se expone directamente para que ninguna pantalla del código viejo se rompa
      empresaSeleccionada,
      setEmpresaSeleccionada,
      empresas,
      setEmpresas,
      seleccionarEmpresa: setEmpresaSeleccionada,
    }),
    // Vigila la cuenta de usuario original y los estados corporativos para reconstruirse
    [usuarioActual, trabajadorActual, empresaSeleccionada, empresas],
  );

  return (
    // Envuelve y expone las propiedades para que todos los hijos tengan acceso libre a la información
    <TrabajadorContext.Provider value={value}>
      {children}
    </TrabajadorContext.Provider>
  );
}

/**
 * Hook personalizado para consumir los datos globales del trabajador con facilidad.
 * Simplifica la importación de estados y evita el tener que llamar a useContext manualmente.
 */
export function useTrabajador() {
  const context = useContext(TrabajadorContext);

  // Validation de seguridad para asegurar que el hook se utiliza en el lugar correcto del proyecto
  if (!context) {
    throw new Error("useTrabajador debe usarse dentro de ProveedorTrabajador");
  }

  return context;
}
