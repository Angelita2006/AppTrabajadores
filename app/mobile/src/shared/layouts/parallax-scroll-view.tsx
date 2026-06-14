import type { PropsWithChildren, ReactElement } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/shared/components/themed-view";

// altura fija para el header de la vista de scroll con efecto parallax
// (efecto de desplazamiento con imagen de fondo que se mueve a diferente velocidad que el contenido)
const HEADER_HEIGHT = 250;
// Props para el componente ParallaxScrollView, que recibe un headerImage (componente React que se muestra como imagen de fondo del header)
// y un headerBackgroundColor (objeto con colores para el fondo del header en modo claro y oscuro).
type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;
// Componente ParallaxScrollView que implementa una vista de scroll con efecto parallax en el header (cabecera).
// Recibe un headerImage que se muestra como imagen de fondo del header, y un headerBackgroundColor que define el color de fondo del header en modo claro y oscuro.
// El contenido de la vista se muestra debajo del header, y el efecto parallax se logra haciendo que el header se desplace a una velocidad diferente al contenido al hacer scroll.
export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, "background");
  const colorScheme = useColorScheme() ?? "light";
  // Animated.ScrollView es un componente de scroll que permite animar su contenido de manera que el header se desplace a una velocidad
  // diferente al contenido, creando el efecto parallax.
  return (
    <Animated.ScrollView style={{ backgroundColor, flex: 1 }}>
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
        ]}
      >
        {headerImage}
      </Animated.View>

      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

// Estilo que deja el overflow oculto en el header para que la imagen de fondo no se desborde,
// y un estilo para el contenido con padding y gap entre elementos.
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: "hidden",
  },
});
