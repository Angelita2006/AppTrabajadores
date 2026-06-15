import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/*
 * Componente IconSymbol que envuelve el componente SymbolView de expo-symbols para mostrar iconos personalizados en la aplicación.
 * Recibe las siguientes propiedades:
 * - name: el nombre del icono a mostrar, que debe ser un valor válido para el componente SymbolView como "chevron.right", "list.bullet", etc.
 * - size: el tamaño del icono (opcional, por defecto es 24).
 * - color: el color del icono, que se pasa como tintColor al componente.
 * - style: estilos adicionales para el contenedor del icono (opcional).
 * - weight: el peso del icono, que se pasa al componente (opcional, por defecto es 'regular').
 */

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: SymbolViewProps["name"];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
