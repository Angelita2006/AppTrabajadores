import { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { ThemedText } from "../../shared/components/themed-text";
import { ThemedView } from "../../shared/components/themed-view";
import { IconSymbol } from "../../shared/ui/icon-symbol";
interface CollapsibleProps extends PropsWithChildren {
  /** El título visible en la barra del encabezado que activa el despliegue. */
  title: string;
}

/**
 * Componente contenedor que permite expandir o contraer su contenido
 * al presionar el encabezado.
 */
export function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? "light";

  // Determina el color del icono según el tema actual del sistema
  const iconColor = theme === "light" ? Colors.light.icon : Colors.dark.icon;

  // Define la rotación de la flecha: 90 grados si está abierto, 0 si está cerrado
  const arrowStyle = { transform: [{ rotate: isOpen ? "90deg" : "0deg" }] };

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={iconColor}
          style={arrowStyle}
        />
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>

      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

// // Componente para secciones de la app que pueden expandirse o contraerse para mostrar u ocultar su contenido
// // Recibe las siguientes propiedades:
// // - title: el título que se muestra en el encabezado del colapsable, que es clickeable para expandir o contraer el contenido.
// // - children: el contenido que se muestra dentro cuando está expandido. Puede ser cualquier elemento React válido.
// export function Collapsible({
//   title,
//   children,
// }: PropsWithChildren & { title: string }) {
//   // El estado isOpen se utiliza para controlar si el contenido del colapsable está expandido o contraído.
//   // Usamos el hook useState para inicializarlo como false (contraído) y una función setIsOpen para actualizar su valor.
//   // El hook useColorScheme se utiliza para obtener el tema actual (claro u oscuro) y ajustar el color del icono de la flecha en consecuencia.
//   // Si el tema no se puede determinar, se asume el tema claro por defecto. El tema se determina según la configuración del sistema operativo, que el usuario puede cambiar desde la configuración de su dispositivo.
//   const [isOpen, setIsOpen] = useState(false);
//   const theme = useColorScheme() ?? "light";

//   // El componente muestra un encabezado con un icono de flecha que indica si el contenido está expandido o contraído.
//   return (
//     <ThemedView>
//       <TouchableOpacity
//         style={styles.heading}
//         onPress={() => setIsOpen((value) => !value)}
//         activeOpacity={0.8}
//       >
//         <IconSymbol
//           name="chevron.right"
//           size={18}
//           weight="medium"
//           color={theme === "light" ? Colors.light.icon : Colors.dark.icon}
//           style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
//         />

//         <ThemedText type="defaultSemiBold">{title}</ThemedText>
//       </TouchableOpacity>
//       {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
//     </ThemedView>
//   );
// }

// Su estilo es sencillo, con un diseño de encabezado que alinea el icono y el texto,
// y un estilo para el contenido que se muestra cuando el colapsable está abierto.
const styles = StyleSheet.create({
  // estilo del encabezado
  heading: {
    // direccion en fila
    flexDirection: "row",
    // alineado al centro
    alignItems: "center",
    // hueco de 6 px entre elementos
    gap: 6,
  },
  // estilo del contenido
  content: {
    // margen superior de 6 px para separar el contenido del encabezado
    marginTop: 6,
    // margen izquierdo de 24 px para alinear el contenido con el texto del encabezado, dejando espacio para el icono de la flecha
    marginLeft: 24,
  },
});
