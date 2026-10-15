import { Platform } from "react-native";

/**
 * Paleta clara basada en los colores que ya utiliza Fichapp y su equivalente
 * oscuro. Los nombres son semánticos para que cada componente use el mismo
 * propósito de color en ambos temas.
 */
export const Colors = {
  light: {
    text: "#111827",
    textSecondary: "#64748B",
    background: "#F6F8FB",
    card: "#FFFFFF",
    surfaceAlt: "#F8FAFC",
    border: "#E2E8F0",
    tint: "#2563EB",
    icon: "#64748B",
    tabIconDefault: "#64748B",
    tabIconSelected: "#2563EB",
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    success: "#16A34A",
    successBackground: "#ECFDF5",
    successBorder: "#BBF7D0",
    warning: "#EA580C",
    warningBackground: "#FFFBEB",
    warningBorder: "#FDE68A",
    danger: "#DC2626",
    dangerBackground: "#FEF2F2",
    dangerBorder: "#FECACA",
    overlay: "rgba(15, 23, 42, 0.45)",
  },
  dark: {
    text: "#F1F5F9",
    textSecondary: "#A8B5C7",
    background: "#0F172A",
    card: "#172235",
    surfaceAlt: "#1E293B",
    border: "#334155",
    tint: "#60A5FA",
    icon: "#A8B5C7",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#60A5FA",
    primary: "#60A5FA",
    onPrimary: "#0B1220",
    success: "#4ADE80",
    successBackground: "#123126",
    successBorder: "#1D5A42",
    warning: "#FDBA74",
    warningBackground: "#382719",
    warningBorder: "#6B4521",
    danger: "#FCA5A5",
    dangerBackground: "#3B2027",
    dangerBorder: "#71313A",
    overlay: "rgba(0, 0, 0, 0.65)",
  },
} as const;

export type AppColorScheme = keyof typeof Colors;
export type ThemeColorName = keyof typeof Colors.light;

/** Colores utilizados por pantallas antiguas, adaptados al token semántico. */
export const LegacyTextColorTokens: Record<string, ThemeColorName> = {
  "#111827": "text",
  "#0f172a": "text",
  "#1e293b": "text",
  "#334155": "text",
  "#374151": "textSecondary",
  "#475569": "textSecondary",
  "#64748b": "textSecondary",
  "#687076": "textSecondary",
  "#94a3b8": "textSecondary",
  "#9ba1a6": "textSecondary",
  "#2563eb": "primary",
  "#1d4ed8": "primary",
  "#0284c7": "primary",
  "#0a7ea4": "primary",
  "#16a34a": "success",
  "#10b981": "success",
  "#15803d": "success",
  "#ea580c": "warning",
  "#f59e0b": "warning",
  "#dc2626": "danger",
  "#ef4444": "danger",
};

/**
 * Fuentes tipográficas para la aplicación, con variantes adaptadas por
 * plataforma.
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
