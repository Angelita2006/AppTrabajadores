import { Colors, ThemeColorName } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName,
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  return colorFromProps ?? Colors[theme][colorName];
}
