import type { PropsWithChildren, ReactElement } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { useColorScheme } from "../../hooks/use-color-scheme";
import { useThemeColor } from "../../hooks/use-theme-color";
import { ThemedView } from "../../shared/components/themed-view";

// altura fija para el header de la vista de scroll con efecto parallax (objetos en primer plano se mueven más rápido que los del fondo al scrollear)
const HEADER_HEIGHT = 250;

// Props para el componente ParallaxScrollView
type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

/*
 * Componente ParallaxScrollView que implementa una vista de scroll con efecto parallax.
 * Recibe las siguientes propiedades:
 * - children (contenido de la vista que se muestra debajo del header)
 * - headerImage (componente react como imagen de fondo del encabezado)
 * - headerBackgroundColor (color del fondo del encabezado en modo claro y oscuro).
 */

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, "background");
  const colorScheme = useColorScheme() ?? "light";
  return (
    // Se usa Animated para que la vista scrolleable se pueda animar creando el efecto parallax.
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
  // contenedor para toda la pantalla
  container: {
    // ocupa todo el espacio disponible del dispositivo
    flex: 1,
  },
  // contenedor para el encabezado (suele ir con portada, banner o título principal)
  header: {
    // altura fija exacta usando la variable HEADER_HEIGHT de 250 px
    height: HEADER_HEIGHT,
    // si la imagen colocada es más grande que la altura fija, corta los bordes para que quepa y no tape nada
    overflow: "hidden",
  },
  // contenedor bajo el encabezado para el contenido
  content: {
    // ocupa todo el espacio restante de la pantalla menos la altura del encabezado
    flex: 1,
    // margen interno de 32 px en bordes y esquinas
    padding: 32,
    // hueco entre elementos de 16 px
    gap: 16,
    // si un elemento interno es muy grande, es recortado para que quepa y no tape nada
    overflow: "hidden",
  },
});
