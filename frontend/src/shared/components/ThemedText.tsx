import {
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";
import { Colors, LegacyTextColorTokens } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useThemeColor } from "../../hooks/use-theme-color";

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

/** Texto que adapta los colores de texto habituales de la interfaz al tema. */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const theme = useColorScheme();
  const defaultColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "text",
  );
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const styleColor = flattenedStyle?.color;
  const legacyToken =
    typeof styleColor === "string"
      ? LegacyTextColorTokens[styleColor.toLowerCase()]
      : undefined;
  const textColor = lightColor || darkColor
    ? defaultColor
    : legacyToken
      ? Colors[theme][legacyToken]
      : styleColor ?? defaultColor;

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

  return (
    <Text style={[typeStyle, flattenedStyle, { color: textColor }]} {...rest} />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  defaultBold: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    fontSize: 16,
    lineHeight: 30,
  },
});
