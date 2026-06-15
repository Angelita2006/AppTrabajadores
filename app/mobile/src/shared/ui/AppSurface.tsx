import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "../components/themed-text";
import AnimatedBackground from "./AnimatedBackground";

// ==========================================
// INTERFACES (TIPOS)
// ==========================================

interface AppScreenProps {
  /** El título principal que se mostrará en el encabezado de la pantalla. */
  title: string;
  /** Un subtítulo descriptivo opcional debajo del título principal. */
  subtitle?: string;
  /** El contenido principal que se renderizará dentro de la pantalla. */
  children: ReactNode;
}

interface StatCardProps {
  /** La etiqueta o nombre del dato estadístico (ej: "Ventas"). */
  label: string;
  /** El valor numérico o texto principal a destacar (ej: "$2,500"). */
  value: string;
  /** El tono de color que define el estado visual de la tarjeta. Por defecto es "neutral". */
  tone?: "neutral" | "success" | "warning" | "danger";
}

// ==========================================
// COMPONENTES
// ==========================================

/**
 * Pantalla base de la aplicación que incluye un encabezado estándar con scroll automático.
 */
export function AppScreen({ title, subtitle, children }: AppScreenProps) {
  return (
    <View style={styles.mainContainer}>
      {/* fondo animado */}
      <AnimatedBackground />

      {/* ScrollView por encima del fondo */}
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.kicker}>FICHAPP</ThemedText>

          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>

          {subtitle && (
            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
          )}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Tarjeta contenedor blanca con bordes definidos para agrupar secciones de información.
 */
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/**
 * Contenedor horizontal que alinea sus elementos en filas y salta de línea si no caben.
 */
export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/**
 * Tarjeta de indicador o métrica clave que cambia su color de fondo según su estado emocional/tono.
 */
export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <View style={[styles.stat, styles[tone]]}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

// /*
//  * Componente AppScreen que representa la pantalla principal de la aplicación.
//  * Recibe las siguientes propiedades:
//  * - title: el título principal de la pantalla.
//  * - subtitle: un subtítulo opcional que se muestra debajo del título.
//  * - children: el contenido que se muestra dentro de la pantalla, que puede ser cualquier elemento React válido.
//  */

// export function AppScreen({
//   title,
//   subtitle,
//   children,
// }: {
//   title: string;
//   subtitle?: string;
//   children: ReactNode;
// }) {
//   return (
//     // Un ScrollView que permite desplazarse verticalmente si el contenido excede la altura de la pantalla.
//     <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
//       <View style={styles.header}>
//         {
//           // El encabezado de la pantalla contiene un "kicker" (un texto pequeño en mayúsculas), el título principal
//           // y un subtítulo opcional si se proporciona, además del contenido que se pasa como children.
//         }
//         <ThemedText style={styles.kicker}>FICHAPP</ThemedText>
//         <ThemedText type="title" style={styles.title}>
//           {title}
//         </ThemedText>
//         {subtitle ? (
//           <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
//         ) : null}
//       </View>
//       {children}
//     </ScrollView>
//   );
// }

// /*
//  * Componente Card para contenido en tarjetas
//  */

// export function Card({ children }: { children: ReactNode }) {
//   return <View style={styles.card}>{children}</View>;
// }

// /*
//  * Componente Row para contenido en filas
//  */

// export function Row({ children }: { children: ReactNode }) {
//   return <View style={styles.row}>{children}</View>;
// }

// /*
//  * Componente StatCard para mostrar mensaje informativo
//  */

// export function StatCard({
//   label,
//   value,
//   tone = "neutral",
// }: {
//   label: string;
//   value: string;
//   tone?: "neutral" | "success" | "warning" | "danger";
// }) {
//   return (
//     <View style={[styles.stat, styles[tone]]}>
//       <ThemedText style={styles.statLabel}>{label}</ThemedText>
//       <ThemedText style={styles.statValue}>{value}</ThemedText>
//     </View>
//   );
// }

const styles = StyleSheet.create({
  // contenedor padre para bloquear el fondo en su sitio
  mainContainer: {
    flex: 1,
  },
  // contenedor de toda la pantalla
  screen: {
    // hace que ocupe todo el espacio disponible del dispositivo
    flex: 1,
    // color de fondo (gris)
    backgroundColor: "#F6F8FB",
  },
  // contenedor del contenido
  content: {
    // hueco de 16 px entre contenido
    gap: 16,
    // margen de 16 px en bordes y esquinas
    padding: 16,
    // margen bajo el contenido para no tapar la barra de navegación
    paddingBottom: 40,
    // ocupa toda la pantalla
    width: "100%",
    // en pantallas muy grandes se limitará al ancho máximo de 1180
    maxWidth: 1180,
    // alinea el contenido en el centro
    alignSelf: "center",
  },
  // contenedor de títulos
  header: {
    // hueco de 4 px para separar el título del subtítulo
    gap: 4,
    // margen superior de 8 px
    paddingTop: 8,
  },
  // etiqueta anterior al título (antetítulo)
  kicker: {
    // color del texto (azul)
    color: "#2563EB",
    // tamaño del texto (12)
    fontSize: 12,
    // peso del texto, en negrita (700)
    fontWeight: "700",
    // texto en mayúsculas
    textTransform: "uppercase",
  },
  // estilo para el título
  title: {
    // color del texto (negro)
    color: "#111827",
    // tamaño del texto (12)
    fontSize: 28,
    // espacio entre líneas (34)
    lineHeight: 34,
  },
  // estilo del subtítulo
  subtitle: {
    // color del texto (gris)
    color: "#64748B",
    // tamaño del texto (15)
    fontSize: 15,
    // espacio entre líneas (22)
    lineHeight: 22,
  },
  // estilo de tarjetas
  card: {
    // fondo blanco
    backgroundColor: "#FFFFFF",
    // borde gris claro
    borderColor: "#E2E8F0",
    // bordes redondeados
    borderRadius: 8,
    // ancho del borde (1)
    borderWidth: 1,
    // hueco entre contenido de la tarjeta de 12 px
    gap: 12,
    // margen de 16 px en bordes y esquinas
    padding: 16,
  },
  // estilo de filas con varios elementos
  row: {
    // coloca los elementos en fila
    flexDirection: "row",
    // si no caben los elementos horizontalmente hacen salto de línea (estilo cuadrícula)
    flexWrap: "wrap",
    // hueco entre elementos tanto verticalmente como horizontalmente de 12 px
    gap: 12,
  },
  // molde para mensajes informativos
  stat: {
    // bordes redondeados
    borderRadius: 8,
    // ancho del borde (1)
    borderWidth: 1,
    // el molde se adapta al espacio libre de la fila
    flexGrow: 1,
    // ancho mínimo de 150 px, hace salto de línea si falta espacio
    minWidth: 150,
    // espacio interno de 14 px
    padding: 14,
  },
  // fondo gris claro con borde gris (informativo general)
  neutral: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  // fondo verce claro con borde verde (positivo)
  success: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  // fondo amarillo claro con borde amarillo (advertencia)
  warning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  // fondo rojo claro con borde rojo (error)
  danger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  // texto del mensaje
  statLabel: {
    // color de texto (gris)
    color: "#64748B",
    // tamaño del texto (12)
    fontSize: 12,
    // peso del texto, negrita suave (600)
    fontWeight: "600",
    // texto en mayúsculas
    textTransform: "uppercase",
  },
  // números o datos importantes del mensaje
  statValue: {
    // color de texto (azul oscuro)
    color: "#0F172A",
    // tamaño del texto (22)
    fontSize: 22,
    // peso del texto, negrita fuerte (800)
    fontWeight: "800",
    // margen superior de 4 px
    marginTop: 4,
  },
});

export const surfaceStyles = styles;
