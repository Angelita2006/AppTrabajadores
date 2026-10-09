import { View, type ViewProps } from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";

/**
 * Propiedades para el componente ThemedView.
 * Extiende todas las propiedades estándar de un contenedor nativo (ViewProps)
 * y añade dos propiedades opcionales para controlar el color de fondo
 * según el tema del dispositivo (Claro u Oscuro)
 *
 * @property {string} [lightColor] - Color de fondo del modo claro.
 * @property {string} [darkColor] - Color de fondo del modo oscuro.
 */

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

/**
 * Contenedor `View` adaptable que cambia su color de fondo automáticamente
 * según el tema del sistema (Claro / Oscuro)
 *
 * @param lightColor - Color de fondo del modo claro (opcional)
 * @param darkColor - Color de fondo del modo oscuro (opcional)
 * @param style - Estilos adicionales del fondo (opcional)
 * @param otherProps - Cualquier otra propiedad nativa de un componente `View`
 */

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background",
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
