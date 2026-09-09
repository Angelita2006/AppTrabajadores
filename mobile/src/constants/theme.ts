import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

/**
 * Tema de colores para la aplicación, con variantes para modo claro y oscuro.
 * Incluye colores base para texto, fondo, iconos y estados funcionales.
 */
export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    card: "#F9FAFB",
    border: "#E5E7EB",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    primary: "#0284C7",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    card: "#1F2937",
    border: "#374151",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    primary: "#38BDF8",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
  },
};

/**
 * Fuentes tipográficas para la aplicación, con variantes adaptadas por plataforma.
 * Incluye fuentes sans-serif, serif, rounded y monospaced.
 */
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
