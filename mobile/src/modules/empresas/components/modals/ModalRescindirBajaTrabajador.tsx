import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

/**
 * Propiedades requeridas para el funcionamiento del componente ModalRescindirBajaTrabajador.
 * Define los parámetros y funciones necesarios para gestionar el cambio de estado laboral del trabajador.
 */
interface ModalRescindirBajaTrabajadorProps {
  /** Identificador o tipo del modal activo actualmente en la interfaz (ej: "rescindir_contrato", "baja", etc.). */
  modalActivo: string;
  /** Objeto que contiene la información detallada del trabajador seleccionado para la operación. */
  trabajadorActual: Trabajador | null;
  /** Función callback que se ejecuta al confirmar y pasar todas las validaciones de la operación. */
  onConfirmar: () => void;
  /** Estado booleano que indica si se está ejecutando una petición asíncrona de procesamiento. */
  procesando: boolean;
  /** Objeto con los estilos personalizados aplicados al modal. */
  styles: any;
  /** Referencia opcional para elementos interactivos o de accesibilidad. */
  botonRef?: any;
}

/**
 * Componente modal encargado de gestionar las operaciones críticas de rescisión de contratos,
 * bajas o reactivaciones de trabajadores, incorporando validaciones previas de integridad y feedback visual.
 *
 * @param props - Propiedades de configuración, estados y manejadores del componente.
 * @returns Estructura visual en React Native con las opciones de confirmación y advertencias de estado.
 */
export const ModalRescindirBajaTrabajador: React.FC<
  ModalRescindirBajaTrabajadorProps
> = ({
  modalActivo,
  trabajadorActual,
  onConfirmar,
  procesando,
  styles,
  botonRef,
}) => {
  // Determina si el trabajador se encuentra actualmente activo en el sistema
  const estaActivo = trabajadorActual?.activo;

  /**
   * Valida los datos esenciales del trabajador seleccionado antes de permitir
   * la ejecución de la acción de cambio de estado laboral.
   */
  const handleValidarYConfirmar = () => {
    // Validación 1: Verificar que existe un trabajador seleccionado en el contexto
    if (!trabajadorActual) {
      mostrarError(
        "No se ha seleccionado ningún trabajador para esta operación.",
      );
      return;
    }

    // Validación 2: Verificar que el trabajador cuenta con un identificador válido
    if (!trabajadorActual.id) {
      mostrarError("El trabajador actual no posee un identificador válido.");
      return;
    }

    // Validación 3: Validar coherencia del tipo de modal activo
    if (!modalActivo || modalActivo.trim() === "") {
      mostrarError("El contexto de la operación no es válido.");
      return;
    }

    // Mensaje informativo previo o de confirmación contextual opcional
    if (modalActivo === "rescindir_contrato") {
      mostrarMensaje(
        "Aviso de Seguridad",
        `Procediendo a rescindir el contrato de ${trabajadorActual.nombre}.`,
      );
    }

    // Si todas las validaciones son correctas, se ejecuta la función de confirmación externa
    onConfirmar();
  };

  return (
    <View>
      {/* Texto descriptivo dinámico según el estado actual del trabajador */}
      <ThemedText
        style={[
          styles.subtituloModal,
          {
            color: estaActivo ? "#DC2626" : "#059669",
            marginBottom: 16,
          },
        ]}
      >
        {estaActivo
          ? `¿Está seguro de que desea proceder con esta operación para ${trabajadorActual?.nombre}? Ésta acción modificará su estado laboral inmediato.`
          : "¿Desea reactivar a este trabajador en la empresa?"}
      </ThemedText>

      {/* Botón interactivo para confirmar la acción con validación previa */}
      <Pressable
        ref={botonRef}
        style={[
          styles.btnGuardarModal,
          {
            backgroundColor: estaActivo ? "#DC2626" : "#059669",
          },
        ]}
        onPress={handleValidarYConfirmar}
        disabled={procesando}
        accessible={true}
        accessibilityRole="button"
      >
        {procesando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.btnGuardarModalTexto}>
            {modalActivo === "rescindir_contrato"
              ? "Confirmar Rescisión"
              : estaActivo
                ? "Confirmar Baja"
                : "Confirmar Reactivación"}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
};
