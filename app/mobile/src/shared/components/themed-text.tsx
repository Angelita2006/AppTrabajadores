import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";

/**
 * Propiedades para el componente ThemedText.
 * Extiende las propiedades nativas de un Text de React Native.
 */
export type ThemedTextProps = TextProps & {
  /** Color del texto usado exclusivamente en el modo claro. */
  lightColor?: string;

  /** Color del texto usado exclusivamente en el modo oscuro. */
  darkColor?: string;

  /**
   * Variante visual del texto que define su tamaño y peso.
   * @default "default"
   */
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "defaultBold"
    | "subtitle"
    | "link";
};

/**
 * Componente de texto inteligente que adapta su color automáticamente
 * según el tema activo del dispositivo (claro u oscuro).
 */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  // Obtiene el color de texto correcto según el tema actual del sistema
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  // Asigna el estilo correspondiente según la variante seleccionada
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
  // texto para párrafos y descripciones
  default: {
    // color del texto (gris)
    color: "#E0E0E0",
    // tamaño de texto (16)
    fontSize: 16,
    // espacio vertical de 24 px entre líneas
    lineHeight: 24,
  },
  // texto seminegrita
  defaultSemiBold: {
    // color del texto (gris)
    color: "#E0E0E0",
    // tamaño de texto (16)
    fontSize: 16,
    // peso del texto, negrita suave
    fontWeight: "600",
    // espacio vertical de 24 px entre líneas
    lineHeight: 24,
  },
  // texto negrita
  defaultBold: {
    // color del texto (gris)
    color: "#E0E0E0",
    // tamaño de texto (16)
    fontSize: 16,
    // peso del texto, negrita
    fontWeight: "bold",
    // espacio vertical de 24 px entre líneas
    lineHeight: 24,
  },
  // título enorme
  title: {
    // color del texto (gris)
    color: "#E0E0E0",
    // tamaño de texto (32)
    fontSize: 32,
    // peso del texto, negrita
    fontWeight: "bold",
    // espacio vertical de 32 px entre líneas
    lineHeight: 32,
  },
  // subtítulo mediano
  subtitle: {
    // color del texto (gris)
    color: "#E0E0E0",
    // tamaño de texto (20)
    fontSize: 20,
    // peso del texto, negrita
    fontWeight: "bold",
  },
  // texto para enlaces o botones web
  link: {
    // color del texto (azul)
    color: "#0a7ea4",
    // tamaño de texto (16)
    fontSize: 16,
    // espacio vertical de 30 px entre líneas
    lineHeight: 30,
  },
});
