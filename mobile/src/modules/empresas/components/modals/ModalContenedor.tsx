import { ThemedText } from "@/src/shared/components/ThemedText";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

/**
 * Propiedades requeridas para el funcionamiento del componente ModalContenedor.
 * Define el estado del modal activo, la función de cierre, los estilos y los componentes hijos.
 */
interface ModalContenedorProps {
  /** Identificador textual del modal que se encuentra activo actualmente, o null si está cerrado. */
  modalActivo: string | null;
  /** Función callback ejecutada al solicitar el cierre del contenedor modal. */
  onCerrar: () => void;
  /** Objeto de estilos personalizados aplicados al contenedor y sus elementos internos. */
  styles: any;
  /** Elementos o componentes hijos renderizados dentro del cuerpo desplazable del modal. */
  children: React.ReactNode;
}

/**
 * Diccionario de títulos descriptivos asociados a cada clave de modal del sistema.
 * Utilizado para mostrar encabezados claros y profesionales según la operación ejecutada.
 */
const TITULOS_MODALES: Record<string, string> = {
  alta_trabajador: "Alta de Expediente (Trabajador)",
  editar_trabajador: "Editar Datos del Trabajador",
  nuevo_contrato: "Formalizar Contrato Legal",
  editar_contrato: "Modificar Contrato Existente",
  rescindir_contrato: "Rescindir Contrato Laboral",
  baja_trabajador: "Tramitar Baja en Empresa",
  asignar_turno: "Asignar Turno de Trabajo",
  reasignar_turno: "Reasignar Turno (Modificación)",
  eliminar_turno: "Quitar Turno Asignado",
  reactivar_trabajador: "Reactivar Trabajador",
};

/**
 * Componente contenedor global para modales en la aplicación. Gestiona la visibilidad,
 * la capa de superposición (overlay), el título dinámico según el contexto de la operación,
 * las validaciones previas de apertura y el cierre controlado con feedback para el usuario.
 *
 * @param props - Propiedades de configuración, estados y manejadores del contenedor.
 * @returns Estructura visual flotante en React Native con la ventana modal y scroll interno.
 */
export const ModalContenedor: React.FC<ModalContenedorProps> = ({
  modalActivo,
  onCerrar,
  styles,
  children,
}) => {
  /**
   * Valida la integridad del identificador del modal antes de permitir su renderizado
   * o gestiona acciones correctivas si el contexto recibido no es válido.
   */
  if (!modalActivo) {
    return null;
  }

  // Validación preventiva: verificar si el identificador activo existe en el catálogo de títulos
  if (!TITULOS_MODALES[modalActivo]) {
    mostrarError(
      "El identificador del modal activo no es reconocido por el sistema.",
    );
  }

  /**
   * Manejador seguro para el evento de cierre del contenedor modal,
   * incorporando validaciones o avisos opcionales si fuera necesario.
   */
  const handleCerrarSeguro = () => {
    mostrarMensaje("Cierre de Ventana", "Cerrando el panel de gestión actual.");
    onCerrar();
  };

  return (
    <Modal visible={true} animationType="slide" transparent>
      <View style={styles.overlayModal}>
        <View style={styles.ventanaModal}>
          {/* Encabezado del modal con título dinámico y botón de cierre validado */}
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitulo}>
              {TITULOS_MODALES[modalActivo] || "Operación"}
            </ThemedText>
            <Pressable
              onPress={handleCerrarSeguro}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
            >
              <FontAwesome5 name="times" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* Contenido principal desplazable del modal */}
          <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
