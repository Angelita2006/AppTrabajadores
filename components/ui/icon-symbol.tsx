// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  person: "person",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
// Componente IconSymbol que muestra iconos personalizados en la aplicación utilizando MaterialIcons en Android y web, y SF Symbols en iOS.
// Recibe las siguientes props:
// - name: el nombre del icono a mostrar, que debe ser un valor válido para el componente SymbolView en iOS,
// y debe tener una correspondencia en MaterialIcons para Android y web.
// - size: el tamaño del icono (opcional, por defecto es 24).
// - color: el color del icono, que se pasa como tintColor al componente SymbolView en iOS, y como color a MaterialIcons en Android y web.
// - style: estilos adicionales para el contenedor del icono (opcional).
// - weight: el peso del icono, que se pasa como prop al componente SymbolView en iOS (opcional, por defecto es 'regular').
// En Android y web, el peso no se utiliza ya que MaterialIcons no tiene variantes de peso.
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
