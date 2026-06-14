import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
// Componente ThemedText que extiende el componente Text de React Native para agregar soporte de temas (claro y oscuro) y estilos predefinidos para diferentes tipos de texto (título, subtítulo, enlace, etc.).
// Recibe las siguientes props:
// - lightColor: el color del texto en modo claro (opcional).
// - darkColor: el color del texto en modo oscuro (opcional).
// - type: el tipo de texto (opcional).
export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "defaultBold"
    | "subtitle"
    | "link";
};
// Función ThemedText que utiliza el hook useThemeColor para determinar el color del texto según el tema actual (claro u oscuro),
// y aplica estilos predefinidos según el tipo de texto especificado en las props.
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  const typeStyle = (() => {
    switch (type) {
      case "title":
        return styles.title;
      case "defaultSemiBold":
        return styles.defaultSemiBold;
      case "subtitle":
        return styles.subtitle;
      case "link":
        return styles.link;
      case "defaultBold":
        return styles.defaultBold;
      default:
        return styles.default;
    }
  })();

  return <Text style={[{ color }, typeStyle, style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    color: "#E0E0E0",
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#E0E0E0",
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "bold",
    color: "#E0E0E0",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
    color: "#E0E0E0",
    // backgroundColor: "#E0E0E0",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E0E0E0",
    // backgroundColor: "#E0E0E0",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
  },
});
