import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

// Diccionario de equivalencias entre SF Symbols y Material Icons.
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
  folder: "folder",
  phone: "phone",
  gavel: "gavel",
  work: "work",
  "location-on": "location-on",
  store: "store",
  "vpn-key": "vpn-key",
  "check-circle": "check-circle",
  error: "error",
  menu: "menu",
  "menu-open": "menu-open",
} as const;

export type IconSymbolName = keyof typeof MAPPING;

interface IconSymbolProps {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}

// Componente de iconos adaptado para Android y Web usando Material Icons.
export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
