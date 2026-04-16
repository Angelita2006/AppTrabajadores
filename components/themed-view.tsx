import { View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
// Componente ThemedView que utiliza el hook useThemeColor para determinar el color de fondo según el tema actual (claro u oscuro),
// y aplica ese color al estilo del componente View. Recibe las siguientes props:
// - lightColor: el color de fondo en modo claro (opcional).
// - darkColor: el color de fondo en modo oscuro (opcional).
export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};
// Función ThemedView que utiliza el hook useThemeColor para determinar el color de fondo según el tema actual (claro u oscuro), y aplica ese color al estilo del componente View. Recibe las siguientes props:
// - lightColor: el color de fondo en modo claro (opcional).
// - darkColor: el color de fondo en modo oscuro (opcional).
// - style: estilos adicionales para el componente View (opcional).
// - otherProps: otras props que se pasan al componente View (opcional).
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
