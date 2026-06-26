// import React, { useState } from "react";
// import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";
// // import { crearFichaje } from "../../../modules/fichajes/api/fichajesService";
// import { crearFichaje } from "../../../modules/fichajes/api/services";
// import {
//   EstadoFichaje,
//   useFichajeStore,
// } from "../../../modules/fichajes/store/useFichajeStore";
// import { ThemedText } from "../../../shared/components/themed-text";
// import { useTrabajador } from "../../trabajadores/store/UsuarioContext";
// /**
//  * Diccionario de configuración estática para adaptar el botón principal según la situación del empleado.
//  * Define las etiquetas, el tipo de evento técnico y los colores para cada estado de la jornada.
//  */
// const ESTADO_CONFIG: Record<
//   EstadoFichaje,
//   {
//     label: string;
//     tipo: "entrada" | "salida" | "descanso" | "fin_descanso";
//     backgroundColor: string;
//     textColor: string;
//   }
// > = {
//   // Configuración cuando el trabajador está fuera de su turno: botón verde de entrada
//   fuera: {
//     label: "Fichar Entrada",
//     tipo: "entrada",
//     backgroundColor: "#16A34A",
//     textColor: "#FFFFFF",
//   },
//   // Configuración cuando el trabajador está en su turno: botón rojo de salida
//   trabajando: {
//     label: "Fichar Salida",
//     tipo: "salida",
//     backgroundColor: "#DC2626",
//     textColor: "#FFFFFF",
//   },
//   // Configuración cuando el trabajador está pausado: botón naranja para reanudar
//   descanso: {
//     label: "Finalizar Descanso",
//     tipo: "fin_descanso",
//     backgroundColor: "#F59E0B",
//     textColor: "#FFFFFF",
//   },
// };

// /**
//  * Componente de botón inteligente y dinámico para realizar el marcaje principal en la aplicación.
//  * Cambia automáticamente de color y de texto basándose en el estado activo del almacén global de Zustand.
//  */
// export const MainActionButton = () => {
//   // Estado local para controlar el indicador visual de carga durante el proceso de guardado
//   const [loading, setLoading] = useState(false);

//   // Suscripciones reactivas para extraer información del almacén global de fichajes
//   const estado = useFichajeStore((s) => s.estadoActual);
//   const empresaId = useFichajeStore((s) => s.empresaId);

//   // Extrae los datos del empleado activo desde el contexto de la sesión
//   const { trabajadorActual } = useTrabajador();

//   // Selecciona el bloque de estilos y textos que corresponde a la situación actual
//   const config = ESTADO_CONFIG[estado];

//   /**
//    * Controlador de eventos encargado de validar e insertar de forma asíncrona el marcaje horario.
//    */
//   const handlePress = async () => {
//     // Validación de seguridad inicial: Requiere que exista un perfil autenticado
//     if (!trabajadorActual) {
//       Alert.alert("Error", "Inicia sesión primero");
//       return;
//     }

//     // Validación de seguridad secundaria: Exige tener una organización seleccionada antes de marcar
//     if (!empresaId) {
//       Alert.alert("Error", "Selecciona una empresa antes de fichar");
//       return;
//     }

//     // Activa el estado de carga para bloquear la interfaz e impedir dobles pulsaciones accidentales
//     setLoading(true);
//     try {
//       // Guarda de forma persistente la acción horaria correspondiente (entrada, salida, etc.)
//       await crearFichaje(
//         Number.parseInt(trabajadorActual.id),
//         empresaId,
//         config.tipo,
//       );

//       // Sincroniza y recarga el almacén de datos global de forma directa sin esperar renderizados
//       await useFichajeStore.getState().cargarFichajesToday();

//       // Muestra un cuadro de diálogo informando del éxito y la hora exacta del registro en formato de dos dígitos
//       Alert.alert(
//         "Éxito",
//         `${config.label.replace("Fichar ", "").replace("Finalizar ", "")} registrada a las ${new Date().toLocaleTimeString(
//           "es-ES",
//           {
//             hour: "2-digit",
//             minute: "2-digit",
//           },
//         )}`,
//       );
//     } catch (error) {
//       Alert.alert("Error", "No se pudo registrar el fichaje");
//       console.error(error);
//     } finally {
//       // Desactiva el indicador de carga devolviendo el botón a su estado operativo habitual
//       setLoading(false);
//     }
//   };

//   return (
//     <Pressable
//       style={[
//         styles.button,
//         // Aplica de forma dinámica el color de fondo correspondiente extraído del mapa de configuración
//         { backgroundColor: config.backgroundColor },
//         // Reduce la opacidad si el componente se encuentra procesando una petición activa
//         loading && styles.buttonDisabled,
//       ]}
//       onPress={handlePress}
//       disabled={loading} // Bloquea la acción táctil si está cargando
//     >
//       {loading ? (
//         // Muestra un círculo de carga si el proceso asíncrono está en curso
//         <ActivityIndicator color="#FFFFFF" />
//       ) : (
//         // Muestra la etiqueta de texto adaptativa si el botón está listo para ser pulsado
//         <ThemedText style={[styles.text, { color: config.textColor }]}>
//           {config.label}
//         </ThemedText>
//       )}
//     </Pressable>
//   );
// };

// const styles = StyleSheet.create({
//   // Botón contenedor principal, define rellenos holgados, bordes redondeados amplios, centrado absoluto y sombras en relieve para iOS y Android
//   button: {
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//     marginVertical: 8,
//     boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
//     elevation: 3,
//   },
//   // Modificador opcional del botón deshabilitado, reduce la opacidad al 60% para indicar inactividad visual
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   // Texto descriptivo de la acción interna, establece un tamaño de letra estándar 16 y negrita semi-marcada
//   text: {
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });
