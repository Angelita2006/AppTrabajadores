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
// import { mockDb } from "../../../services/api/mockDb";
import {
  obtenerEmpresasTrabajador,
  obtenerTrabajador,
} from "../../../modules/trabajadores/api/services";

/**
 * Interfaz que define el molde de datos del contexto de trabajadores.
 * Especifica todos los estados globales y las funciones que estarán disponibles en la app.
 */
interface TrabajadorContextValue {
  // Objeto con la información del empleado que ha iniciado sesión, o null si no hay nadie autenticado
  trabajadorActual: Trabajador | null;
  // Función para modificar o guardar el perfil del trabajador actual de forma global
  setTrabajadorActual: (trabajador: Trabajador | null) => void;
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
 * Inicializa y administra de forma centralizada la información del usuario y sus empresas.
 */
export function ProveedorTrabajador({ children }: { children: ReactNode }) {
  // Estado para controlar el perfil global del trabajador activo
  const [trabajadorActual, setTrabajadorActual] = useState<Trabajador | null>(
    null,
  );
  // Estado para rastrear con qué empresa se están revisando los turnos y vacaciones
  const [empresaSeleccionada, setEmpresaSeleccionada] =
    useState<Empresa | null>(null);
  // Estado para almacenar el listado de las organizaciones vinculadas al empleado
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  // Efecto secundario que realiza una carga de datos automática simulación al iniciar la app
  useEffect(() => {
    // Variable de control para evitar actualizaciones si el componente se desmonta antes de recibir la respuesta
    let mounted = true;

    // Ejecuta de forma simultánea las consultas para el trabajador con ID número 1
    Promise.all([
      // mockDb.getTrabajador(1),
      obtenerTrabajador(1),
      // mockDb.getEmpresasTrabajador(1),
      obtenerEmpresasTrabajador(1),
    ]).then(([trabajador, empresasIniciales]) => {
      // Detiene la actualización si el usuario ya salió o cambió de sección en la app
      if (!mounted) return;

      // Guarda los datos obtenidos por defecto dentro de la sesión de memoria activa
      setTrabajadorActual(trabajador);
      setEmpresas(empresasIniciales);
      // Asigna la primera empresa de la lista como la seleccionada por defecto
      setEmpresaSeleccionada(empresasIniciales[0] ?? null);
    });

    // Función de limpieza que desactiva el control de montado al destruir el componente
    return () => {
      mounted = false;
    };
  }, []);

  // Almacena de forma optimizada en memoria el objeto de datos globales para evitar renderizados innecesarios
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
    // Vigila estos tres estados y solo reconstruye el objeto si alguno de ellos cambia de valor
    [trabajadorActual, empresaSeleccionada, empresas],
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

  // Validación de seguridad para asegurar que el hook se utiliza en el lugar correcto del proyecto
  if (!context) {
    throw new Error("useTrabajador debe usarse dentro de ProveedorTrabajador");
  }

  return context;
}
