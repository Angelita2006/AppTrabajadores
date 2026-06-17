import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
// import { obtenerEmpresas } from "../../../modules/empresas/api/empresasService";
import { obtenerEmpresas } from "../../../modules/empresas/api/services";
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";
import { Empresa } from "../types/empresa";

/**
 * Pantalla principal encargada de listar y seleccionar las empresas del sistema.
 * Aplica filtros de seguridad basados en el rol del usuario para restringir la visibilidad.
 */
export default function EmpresasScreen() {
  // Datos y funciones extraídos de la sesión global del contexto de la aplicación
  const {
    trabajadorActual,
    empresaSeleccionada,
    setEmpresaSeleccionada,
    setEmpresas,
  } = useTrabajador();

  // Estado local para almacenar el catálogo de corporaciones visibles en pantalla
  const [empresas, setListaEmpresas] = useState<Empresa[]>([]);

  /**
   * Consulta las empresas y filtra el listado según los permisos de acceso del perfil.
   * Utiliza useCallback para fijar la función en memoria e impedir renderizados infinitos.
   */
  const cargar = useCallback(async () => {
    if (!trabajadorActual) return;

    const data = await obtenerEmpresas();

    // Si el usuario es administrador ve todo; si es empleado común solo ve donde está vinculado
    const visibles =
      trabajadorActual?.role === "admin"
        ? data
        : data.filter((empresa: { trabajadores: number[] }) =>
            empresa.trabajadores?.includes(trabajadorActual?.id ?? 0),
          );

    setListaEmpresas(visibles);
    setEmpresas(visibles); // Sincroniza la lista de forma global

    // Si no hay ninguna seleccionada todavía, establece la primera de la lista por defecto
    if (!empresaSeleccionada && visibles[0])
      setEmpresaSeleccionada(visibles[0]);
  }, [
    empresaSeleccionada,
    setEmpresaSeleccionada,
    setEmpresas,
    trabajadorActual,
  ]);

  // Invoca el ciclo de carga cada vez que se detectan modificaciones en las dependencias
  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    // Contenedor base de la vista que hereda el fondo con el degradado animado por detrás
    <AppScreen
      title="Empresas"
      subtitle="Selecciona la empresa activa para fichajes, horarios e incidencias."
    >
      {/* SECCIÓN: Fila superior con tarjetas estadísticas rápidas */}
      <Row>
        <StatCard label="Empresas visibles" value={String(empresas.length)} />
        <StatCard
          label="Empresa activa"
          value={empresaSeleccionada?.nombre ?? "Sin seleccionar"}
          tone="success" // Aplica un fondo verde para destacar la organización seleccionada
        />
      </Row>

      {/* SECCIÓN: Rejilla contenedora con las fichas de las empresas */}
      <View style={styles.grid}>
        {empresas.map((empresa) => {
          // Evalúa de forma posicional si la tarjeta iterada coincide con la activa
          const selected = empresaSeleccionada?.id === empresa.id;

          return (
            <Card key={empresa.id}>
              {/* Encabezado interno de la ficha: Logotipo sintético y datos fiscales */}
              <View style={styles.companyHeader}>
                <View style={styles.logo}>
                  <ThemedText style={styles.logoText}>
                    {empresa.nombre.slice(0, 2).toUpperCase()}{" "}
                    {/* Extrae las dos primeras letras como logotipo */}
                  </ThemedText>
                </View>
                <View style={styles.companyInfo}>
                  <ThemedText style={styles.title}>{empresa.nombre}</ThemedText>
                  <ThemedText style={styles.meta}>{empresa.cif}</ThemedText>
                </View>
              </View>

              {/* Bloque central con datos geográficos y estadísticas de vinculación */}
              <ThemedText style={styles.body}>
                {empresa.direccion}, {empresa.poblacion} ({empresa.provincia})
              </ThemedText>
              <ThemedText style={styles.body}>
                {empresa.trabajadores?.length ?? 0} trabajadores vinculados
              </ThemedText>

              {/* Botón táctil de selección con variación dinámica de color */}
              <Pressable
                style={[styles.button, selected && styles.buttonSelected]}
                onPress={() => setEmpresaSeleccionada(empresa)}
              >
                <ThemedText style={styles.buttonText}>
                  {selected ? "Empresa activa" : "Usar esta empresa"}
                </ThemedText>
              </Pressable>
            </Card>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Rejilla de distribución vertical, define un hueco de separación constante de 12 px entre las tarjetas
  grid: {
    gap: 12,
  },
  // Cabecera interna de la ficha, coloca elementos en horizontal y los centra verticalmente
  companyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  // Recuadro del logotipo corporativo, fondo azul suave, centrado absoluto y dimensiones fijas de 44 px
  logo: {
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  // Siglas dentro del logotipo, color azul intenso y peso tipográfico fuerte
  logoText: {
    color: "#1D4ED8",
    fontWeight: "900",
  },
  // Bloque contenedor de textos fiscales, se expande para absorber todo el ancho libre de la fila
  companyInfo: {
    flex: 1,
  },
  // Nombre de la organización, color azul oscuro casi negro, tamaño 18 y negrita máxima
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  // Texto complementario del código CIF, color gris claro informativo
  meta: {
    color: "#64748B",
  },
  // Líneas del cuerpo con la dirección postal y volumen de plantilla, color azul grisáceo suave
  body: {
    color: "#475569",
  },
  // Botón táctil estándar disponible, fondo azul corporativo, bordes redondeados y relleno interno de 12 px
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    padding: 12,
  },
  // Variación estética para el botón activo, cambia el fondo original a color verde de confirmación
  buttonSelected: {
    backgroundColor: "#16A34A",
  },
  // Texto indicativo dentro del botón de selección, color blanco, negrita máxima y alineación centrada
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
});
