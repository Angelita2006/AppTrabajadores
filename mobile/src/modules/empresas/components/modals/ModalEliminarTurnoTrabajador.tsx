import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

/**
 * Propiedades requeridas para el funcionamiento del componente ModalEliminarTurnoTrabajador.
 * Define los parámetros y manejadores necesarios para gestionar la desvinculación de turnos.
 */
interface ModalEliminarTurnoTrabajadorProps {
  /** Objeto que contiene la información detallada del trabajador al que se le eliminarán los turnos. */
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
 * Componente modal encargado de gestionar la eliminación y desvinculación de los turnos activos
 * de un trabajador para el mes actual, incorporando validaciones previas de integridad y feedback con el usuario.
 *
 * @param props - Propiedades de configuración, estados y manejadores del componente.
 * @returns Estructura visual en React Native con las opciones de confirmación y advertencias de desvinculación.
 */
export const ModalEliminarTurnoTrabajador: React.FC<
  ModalEliminarTurnoTrabajadorProps
> = ({ trabajadorActual, onConfirmar, procesando, styles, botonRef }) => {
  /**
   * Valida los datos esenciales del trabajador seleccionado antes de permitir
   * la ejecución de la acción de desvinculación de los turnos del mes actual.
   */
  const handleValidarYConfirmar = () => {
    // Validación 1: Verificar que se haya seleccionado un trabajador válido
    if (!trabajadorActual) {
      mostrarError(
        "No se ha seleccionado ningún trabajador para desvincular turnos.",
      );
      return;
    }

    // Validación 2: Verificar que el trabajador cuente con un identificador único en el sistema
    if (!trabajadorActual.id) {
      mostrarError(
        "El trabajador seleccionado no posee un identificador válido.",
      );
      return;
    }

    // Mensaje informativo opcional notificando la acción crítica que se va a realizar
    mostrarMensaje(
      "Aviso de Desvinculación",
      `Procediendo a eliminar los turnos activos del mes actual para ${trabajadorActual.nombre}.`,
    );

    // Si las validaciones son correctas, se ejecuta la función de confirmación externa
    onConfirmar();
  };

  return (
    <View>
      {/* Texto descriptivo de advertencia sobre la eliminación de turnos */}
      <ThemedText style={[styles.subtituloModal, { marginBottom: 16 }]}>
        ¿Desea desvincular los turnos activos de {trabajadorActual?.nombre} para
        el mes actual?
      </ThemedText>

      {/* Botón interactivo para confirmar la acción con validación previa integrada */}
      <Pressable
        ref={botonRef}
        style={[styles.btnGuardarModal, { backgroundColor: "#EA580C" }]}
        onPress={handleValidarYConfirmar}
        disabled={procesando}
        accessible={true}
        accessibilityRole="button"
      >
        {procesando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.btnGuardarModalTexto}>
            Confirmar Eliminación de Asignación
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
};
