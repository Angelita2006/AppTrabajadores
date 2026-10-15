import { Text, type TextProps } from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";

export type ThemedButtonProps = TextProps & {
  title: string;
  onPress: () => void;
};

/** Botón básico con contraste adaptado a la paleta activa. */
export function ThemedButton({
  title,
  onPress,
  style,
  ...rest
}: ThemedButtonProps) {
  const color = useThemeColor({}, "onPrimary");
  const backgroundColor = useThemeColor({}, "primary");

  return (
    <Text
      onPress={onPress}
      style={[
        {
          color,
          backgroundColor,
          padding: 10,
          borderRadius: 5,
          textAlign: "center",
        },
        style,
      ]}
      {...rest}
    >
      {title}
    </Text>
  );
}
