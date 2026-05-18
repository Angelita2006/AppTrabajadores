import { Text, type TextProps } from "react-native";
import { useThemeColor } from "../hooks/use-theme-color";

export type ThemedButtonProps = TextProps & {
  title: string;
  onPress: () => void;
};

export function ThemedButton({
  title,
  onPress,
  style,
  ...rest
}: ThemedButtonProps) {
  const color = useThemeColor({}, "text");
  return (
    <Text
      onPress={onPress}
      style={[
        { color, padding: 10, backgroundColor: "#E0E0E0", borderRadius: 5 },
        style,
      ]}
      {...rest}
    >
      {title}
    </Text>
  );
}
