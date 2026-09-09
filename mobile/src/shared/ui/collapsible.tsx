import { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { ThemedText } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { IconSymbol } from "./IconSymbol";

interface CollapsibleProps extends PropsWithChildren {
  // El título visible en la barra del encabezado que activa el despliegue
  title: string;
}

// Componente contenedor que permite expandir o contraer su contenido
// al presionar el encabezado de forma fluida
export function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? "light";

  // Valor compartido para animar la rotación de la flecha
  const rotation = useSharedValue(0);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    rotation.value = withTiming(nextState ? 90 : 0, { duration: 200 });
  };

  // Determina el color del icono según el tema actual del sistema
  const iconColor = theme === "light" ? Colors.light.icon : Colors.dark.icon;

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={toggleOpen}
        activeOpacity={0.7}
      >
        <Animated.View style={arrowAnimatedStyle}>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={iconColor}
          />
        </Animated.View>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>

      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
