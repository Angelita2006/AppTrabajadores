import Animated from "react-native-reanimated";

/**
 * Componente que muestra una mano saludando con una animación de balanceo.
 * Ideal para dar la bienvenida al usuario en la cabecera de la aplicación.
 */
export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28, // Tamaño de la mano grande y visible
        lineHeight: 32, // Espacio de línea alineado al tamaño
        marginTop: -6, // Ajuste hacia arriba para centrar la mano con el texto de al lado

        // --- PROPIEDADES DE ANIMACIÓN DE EXPO WEB ---
        // (Nota: Estos estilos CSS solo se activan al renderizar la app en el navegador web)
        animationName: {
          "50%": { transform: [{ rotate: "25deg" }] }, // Inclina la mano 25 grados a mitad del ciclo
        },
        animationIterationCount: 4, // Repite el balanceo de la mano 4 veces al cargar
        animationDuration: "300ms", // Cada movimiento completo dura 300 milisegundos
      }}
    >
      👋
    </Animated.Text>
  );
}
