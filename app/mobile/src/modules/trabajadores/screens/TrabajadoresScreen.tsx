import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
// import { obtenerTrabajadores } from "../../../modules/trabajadores/api/trabajadoresService";
import { obtenerTrabajadores } from "../../../modules/trabajadores/api/services";
import {
  Estado,
  Trabajador,
} from "../../../modules/trabajadores/types/trabajador";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";

/**
 * Traduce el enumerado de estado a una cadena de texto legible para el usuario.
 * Si el estado no está definido, devuelve un mensaje por defecto.
 *
 * @param estado - Código del estado actual extraído del objeto Trabajador.
 * @returns Cadena de texto correspondiente al nombre del estado.
 */
const estadoLabel = (estado?: Estado) =>
  estado === undefined ? "Sin estado" : Estado[estado];

/**
 * Pantalla principal que muestra el directorio completo de los empleados del sistema.
 * Permite visualizar métricas rápidas de los estados y la lista detallada de personal.
 */
export default function TrabajadoresScreen() {
  // Estado local para almacenar el listado de trabajadores recuperados
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  // Carga automática de la lista al renderizar la pantalla por primera vez
  useEffect(() => {
    obtenerTrabajadores().then(setTrabajadores);
  }, []);

  // Filtra de forma dinámica a los empleados excluyendo a los que estén dados de baja u ocultos
  const activos = trabajadores.filter(
    (item) => item.estado !== Estado.Inactivo,
  );

  return (
    // Contenedor general que integra el fondo animado del degradado por detrás
    <AppScreen
      title="Trabajadores"
      subtitle="Directorio operativo para controlar jornada, empresa y estado."
    >
      {/* SECCIÓN: Fila superior con tarjetas estadísticas rápidas */}
      <Row>
        <StatCard label="Total" value={String(trabajadores.length)} />
        <StatCard
          label="Activos"
          value={String(activos.length)}
          tone="success" // Aplica un fondo verde para destacar al personal activo
        />
        <StatCard
          label="Administradores"
          value={String(
            trabajadores.filter((item) => item.role === "admin").length,
          )}
        />
      </Row>

      {/* SECCIÓN: Mapeo y generación de fichas individuales por empleado */}
      {trabajadores.map((trabajador) => (
        <Card key={trabajador.id}>
          <View style={styles.row}>
            {/* Elemento visual del avatar con las iniciales del nombre y apellido */}
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {trabajador.nombre[0]}
                {trabajador.apellidos[0]}
              </ThemedText>
            </View>

            {/* Bloque central con el nombre completo y los datos básicos de contacto */}
            <View style={styles.info}>
              <ThemedText style={styles.name}>
                {trabajador.nombre} {trabajador.apellidos}
              </ThemedText>
              <ThemedText style={styles.meta}>
                {trabajador.puesto} · {trabajador.email}
              </ThemedText>
            </View>

            {/* Etiqueta lateral derecha que muestra el estado actual traducido */}
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {estadoLabel(trabajador.estado)}
              </ThemedText>
            </View>
          </View>

          {/* Fila de detalles geográficos y cantidad de corporaciones asignadas */}
          <ThemedText style={styles.body}>
            {trabajador.poblacion}, {trabajador.provincia} ·{" "}
            {trabajador.empresas?.length ?? 0} empresas
          </ThemedText>
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // fila del contenedor, alinea elementos en horizontal, los centra verticalmente y salta de línea si no caben
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  // recuadro del avatar, fondo azul claro, centrado absoluto y dimensiones fijas de 44 px
  avatar: {
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  // iniciales dentro del avatar, color azul oscuro y grosor de letra al máximo
  avatarText: {
    color: "#0369A1",
    fontWeight: "900",
  },
  // bloque central de información, se expande para ocupar el espacio libre y define un ancho mínimo de 220 px
  info: {
    flex: 1,
    minWidth: 220,
  },
  // texto del nombre completo, color azul oscuro casi negro, tamaño 17 y negrita fuerte
  name: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },
  // texto secundario con los datos de contacto, color gris intermedio
  meta: {
    color: "#64748B",
  },
  // etiqueta contenedora del estado, fondo azul violáceo claro y bordes totalmente redondeados tipo píldora
  badge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  // texto dentro de la etiqueta de estado, color azul violáceo oscuro, tamaño compacto de 12 y negrita fuerte
  badgeText: {
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "800",
  },
  // texto de la descripción inferior o ubicación, color azul grisáceo suave
  body: {
    color: "#475569",
  },
});
