import { Text, type TextProps } from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";

/**
 * Propiedades para el componente ThemedButton.
 * Extiende las propiedades nativas de un Text de React Native.
 */
export type ThemedButtonProps = TextProps & {
  /** El texto que se mostrará dentro del botón. */
  title: string;

  /** Función que se ejecuta cuando el usuario presiona el botón. */
  onPress: () => void;
};

/**
 * Componente de botón personalizado basado en texto.
 * Adapta el color de la tipografía automáticamente según el tema activo (claro u oscuro).
 */
export function ThemedButton({
  title,
  onPress,
  style,
  ...rest
}: ThemedButtonProps) {
  // Obtiene el color de texto adaptativo según el tema del sistema
  const color = useThemeColor({}, "text");

  return (
    <Text
      onPress={onPress}
      style={[
        {
          color,
          padding: 10,
          backgroundColor: "#E0E0E0", // Fondo gris claro base del botón
          borderRadius: 5, // Esquinas ligeramente redondeadas
          textAlign: "center", // Centra el texto dentro de su contenedor
        },
        style,
      ]}
      {...rest}
    >
      {title}
    </Text>
  );
}
