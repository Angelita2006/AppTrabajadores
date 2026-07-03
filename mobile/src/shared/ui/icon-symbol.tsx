import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

/**
 * Iconos y simbolos utilizados en la aplicación.
 * - Material Icons: [Icons Directory](https://icons.expo.fyi).
 * - SF Symbols: [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.down": "expand-more",
  "chevron.right": "chevron-right",
  person: "person",
  "briefcase.fill": "work",
  group: "group",
  schedule: "schedule",
  event: "event",
  warning: "warning",
  "visibility-off": "visibility-off",
  visibility: "visibility",
  mail: "mail",
  lock: "lock",
  stop: "stop",
  pause: "pause",
  "play-circle": "play-circle",
  logout: "logout",
  "manage-accounts": "manage-accounts",
  business: "business",
  description: "description",
  "corporate-fare": "corporate-fare",
  badge: "badge",
  shield: "shield",
} as const;

type IconSymbolName = keyof typeof MAPPING;

/**
 * Un componente de icono que utiliza SF Symbols nativos en iOS y Material Icons en Android y web.
 * Esto asegura una apariencia consistente en todas las plataformas y un uso óptimo de los recursos.
 * Los nombres de los iconos se basan en SF Symbols y requieren un mapeo manual a Material Icons.
 * Recibe las siguientes props:
 * - name: el nombre del icono a mostrar, que debe tener una correspondencia en MaterialIcons para Android y web.
 * - size: el tamaño del icono (opcional, por defecto es 24).
 * - color: el color del icono, que se pasa como tintColor al componente SymbolView en iOS, y como color a MaterialIcons en Android y web.
 * - style: estilos adicionales para el contenedor del icono (opcional).
 */

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
