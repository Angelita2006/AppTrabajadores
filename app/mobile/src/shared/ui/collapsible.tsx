import { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { IconSymbol } from "@/shared/ui/icon-symbol";

// Componente de colapsable para secciones de la app que pueden expandirse o contraerse para mostrar u ocultar su contenido
// respectivamente. Recibe un título y el contenido a mostrar dentro del colapsable.
// Recibe los siguientes props:
// - title: el título que se muestra en el encabezado del colapsable, que es clickeable para expandir o contraer el contenido.
// - children: el contenido que se muestra dentro del colapsable cuando está expandido. Puede ser cualquier elemento React válido.
export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  // El estado isOpen se utiliza para controlar si el contenido del colapsable está expandido o contraído.
  // Usamos el hook useState para inicializarlo como false (contraído) y una función setIsOpen para actualizar su valor.
  // El hook useColorScheme se utiliza para obtener el tema actual (claro u oscuro) y ajustar el color del icono de la flecha en consecuencia.
  // Si el tema no se puede determinar, se asume el tema claro por defecto.
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? "light";

  // El componente muestra un encabezado con un icono de flecha que indica si el contenido está expandido o contraído.
  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === "light" ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
        />

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

// Su estilo es sencillo, con un diseño de encabezado que alinea el icono y el texto,
// y un estilo para el contenido que se muestra cuando el colapsable está abierto.
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
