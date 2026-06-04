import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useTrabajador } from "../../context/TrabajadorContext";
import { Empresa } from "../../src/models/empresas";
import { obtenerEmpresas } from "../../src/services/empresasService";
import {
  agregarEmpresaATrabajador,
  obtenerEmpresasTrabajador,
} from "../../src/services/shared/sharedService";

// VerEmpresas es la pantalla donde el trabajador puede ver sus empresas y seleccionar cuál va a usar.
// Los administradores ven todas las empresas, mientras que los usuarios normales solo ven las empresas ya asociadas a su cuenta.
export default function VerEmpresas() {
  // Contexto global del trabajador: información del usuario logueado y sus permisos.
  const trabajador = useTrabajador().trabajadorActual;

  // Guardamos el id del trabajador para evitar usar undefined en las consultas.
  const trabajadorId = trabajador?.id || 0;

  // Estado local de empresas que el usuario puede ver o seleccionar.
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  // Carga inicial de empresas según el rol del trabajador.
  // - Si es admin, carga todas las empresas.
  // - Si no, carga solo las empresas vinculadas al trabajador.
  useEffect(() => {
    const cargarMisEmpresas = async () => {
      if (trabajador?.role === "admin") {
        const todas = await obtenerEmpresas();
        setEmpresas(todas);
      } else {
        const data = await obtenerEmpresasTrabajador(trabajador?.id || 0);
        setEmpresas(data);
      }
    };
    cargarMisEmpresas();
  }, [trabajador?.id, trabajador?.role]);

  // Obtenemos desde el contexto la empresa actualmente seleccionada y su setter.
  const { empresaSeleccionada, setEmpresaSeleccionada } = useTrabajador();

  // Al seleccionar una empresa la guardamos en el contexto para que otras pantallas la usen.
  const handleSeleccionarEmpresa = (empresa: Empresa) => {
    setEmpresaSeleccionada(empresa);
  };

  // Empresas que un usuario normal puede añadir. Los admins no usan esta lista.
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);

  // Carga empresas que no estén ya asociadas al trabajador.
  // Esto permite ofrecer solo las empresas disponibles para añadir.
  useEffect(() => {
    const cargarDatos = async () => {
      if (trabajador?.role === "admin") {
        setEmpresasDisponibles([]);
        return;
      }

      const disponibles = await obtenerEmpresas();
      const asociadas = await obtenerEmpresasTrabajador(trabajadorId);
      const asociadasIds = asociadas.map((e) => e.id);
      const filtradas = disponibles.filter((e) => !asociadasIds.includes(e.id));
      setEmpresasDisponibles(filtradas);
    };
    cargarDatos();
  }, [trabajador?.role, trabajadorId]);

  // Re-carga de las empresas del trabajador cuando cambia el usuario o su rol.
  // Esto permite mantener la lista sincronizada tras acciones como añadir empresas.
  useEffect(() => {
    const cargarEmpresasTrabajador = async () => {
      if (trabajadorId === 0) {
        setEmpresas([]);
        return;
      }
      if (trabajador?.role === "admin") {
        const todas = await obtenerEmpresas();
        setEmpresas(todas);
        return;
      }
      try {
        const empresasUsuario = await obtenerEmpresasTrabajador(trabajadorId);
        setEmpresas(empresasUsuario);
      } catch (error) {
        console.error("Error cargando empresas del trabajador:", error);
      }
    };

    cargarEmpresasTrabajador();
  }, [trabajadorId, trabajador?.role]);

  // Añade una empresa disponible al trabajador y actualiza el estado local.
  // También elimina la empresa de la lista de disponibles para evitar duplicados.
  const handleSeleccionarDisponible = async (empresa: Empresa) => {
    if (trabajadorId === 0) return alert("Inicia sesión primero");

    try {
      const nuevasDisponibles = empresasDisponibles.filter(
        (e) => e.id !== empresa.id,
      );
      setEmpresasDisponibles(nuevasDisponibles);
      await agregarEmpresaATrabajador(trabajadorId, empresa.id);

      // Actualizamos el estado local agregando la nueva empresa al array.
      setEmpresas((prev) => [...prev, empresa]);

      alert(`Empresa ${empresa.nombre} añadida.`);
    } catch (error) {
      if (error instanceof Error)
        alert("No se pudo añadir la empresa: " + error.message);
      else alert("Error desconocido");
    }
  };

  // Eliminar empresa de la lista local del trabajador.
  // Esta acción no actualiza la base de datos remota porque la app usa datos mock.
  // Se mantiene la empresa en disponibles para poder volver a añadirla.
  const handleEliminarEmpresa = (empresaId: number) => {
    const empresaEliminada = empresas.find((e) => e.id === empresaId);
    setEmpresas(empresas.filter((e) => e.id !== empresaId));

    if (empresaEliminada) {
      setEmpresasDisponibles([...empresasDisponibles, empresaEliminada]);
    }
  };

  return (
    // Animated.ScrollView se usa para que la pantalla pueda desplazarse cuando hay muchas empresas.
    // El uso de estilos compartidos hace la UI consistente con el tema general de la app.
    <>
      <Animated.ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
      >
        {trabajador?.role !== "admin" && (
          <ThemedView style={styles.listContainer}>
            <ThemedText style={styles.titleContainer}>
              Empresas disponibles
            </ThemedText>

            {empresasDisponibles.map((empresa) => (
              <ThemedView key={empresa.id} style={styles.empresaCard}>
                <ThemedText type="default" style={styles.empresaText}>
                  {empresa.nombre} - {empresa.cif}
                </ThemedText>

                <TouchableOpacity
                  onPress={() => handleSeleccionarDisponible(empresa)}
                  style={styles.addbutton}
                >
                  <IconSymbol name="chevron.down" size={24} color="#7dd3fc" />
                </TouchableOpacity>
              </ThemedView>
            ))}
          </ThemedView>
        )}

        <ThemedView style={styles.listContainer}>
          <ThemedText style={styles.titleContainer}>Mis empresas</ThemedText>

          {empresas.map((empresa) => (
            <ThemedView key={empresa.id} style={styles.empresaCard}>
              <ThemedView style={styles.stepContainer}>
                <ThemedView style={styles.row}>
                  {/* <IconSymbol name="building" size={24} color="#7dd3fc" /> */}
                  <ThemedText type="default" style={styles.empresaText}>
                    {empresa.nombre} - {empresa.cif}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.row}>
                  <ThemedView style={styles.buttonContainer}>
                    <TouchableOpacity
                      onPress={() => handleEliminarEmpresa(empresa.id)}
                      style={styles.deleteButton}
                    >
                      <ThemedText style={styles.buttonText}>
                        Eliminar
                      </ThemedText>
                    </TouchableOpacity>
                    {(empresa.id !== empresaSeleccionada?.id && (
                      <TouchableOpacity
                        onPress={() => {
                          handleSeleccionarEmpresa(empresa);
                        }}
                        style={styles.selectButton}
                      >
                        <ThemedText style={styles.buttonText}>
                          Seleccionar
                        </ThemedText>
                      </TouchableOpacity>
                    )) || (
                      <ThemedView style={styles.selectedButton}>
                        <ThemedText style={styles.buttonText}>
                          Seleccionada
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>

        <Link href="../" asChild>
          <TouchableOpacity style={styles.backButton}>
            <ThemedText type="subtitle">Volver</ThemedText>
          </TouchableOpacity>
        </Link>
      </Animated.ScrollView>
    </>
  );
}

// Estilos
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#071826",
  },
  pageContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  // Estilo para el contenedor del título, que organiza el título en una fila con un espacio entre los elementos.
  titleContainer: {
    color: "#e2f6ff",
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
  },
  // Estilo para el link de navegación, que agrega un margen superior para separarlo del contenido.
  link: {
    marginTop: 16,
  },
  stepContainer: {
    backgroundColor: "transparent",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  // Estilo para el contenedor de la lista de empresas, que agrega un margen superior para separarlo del título.
  listContainer: {
    backgroundColor: "#082f4d",
    marginTop: 16,
    margin: 5,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#14436d",
  },
  // Estilo para la tarjeta de cada empresa, que agrega padding, un fondo claro, bordes redondeados, un margen inferior y un borde.
  empresaCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0d3c60",
    marginBottom: 12,
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    alignSelf: "center",
    width: "100%",
  },
  // Cada tarjeta representa una empresa y contiene las acciones que se pueden realizar sobre ella.
  // Estilo para el texto de cada empresa, que define el tamaño de fuente, el margen inferior y el color.
  // empresaText: {
  //   fontSize: 16,
  //   marginBottom: 10,
  //   color: "#e2f6ff",
  //   width: "100%",
  //   flexDirection: "row",
  //   justifyContent: "center",
  // },
  // Estilo para el contenedor de los botones de cada empresa, que organiza los botones en una fila con espacio entre ellos.
  buttonContainer: {
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    margin: 5,
    width: "100%",
  },
  // Estilo para el botón de eliminar empresa, que define un fondo rojo, padding, bordes redondeados y alineación centrada.
  deleteButton: {
    backgroundColor: "#ef5b5b",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  // Estilo para el botón de seleccionar empresa, que define un fondo azul, padding, bordes redondeados y alineación centrada.
  selectButton: {
    backgroundColor: "#16c2d9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  // // Estilo para el texto de los botones, que define el color blanco y un tamaño de fuente.
  // buttonText: {
  //   color: "white",
  //   fontSize: 14,
  //   fontWeight: "700",
  //   width: "100%",
  // },
  // Estilo para el botón de agregar empresa, que define un fondo azul, padding, bordes redondeados, alineación centrada y un margen superior.
  button: {
    backgroundColor: "#16c2d9",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    margin: 5,
    alignSelf: "center",
    minWidth: 140,
  },
  backButton: {
    backgroundColor: "#0f2a45",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    margin: 5,
    alignSelf: "center",
    minWidth: 140,
  },
  selectedButton: {
    backgroundColor: "#34C759",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addbutton: {
    padding: 10,
  },
  // Estilo para el contenedor de agregar empresa, que agrega un margen superior y un espacio entre los elementos.
  addContainer: {
    marginTop: 16,
    gap: 8,
  },
  // Estilo para los campos de entrada, que agrega padding, bordes, bordes redondeados y un fondo blanco.
  input: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  // Modifica este estilo para centrar el texto correctamente
  empresaText: {
    fontSize: 16,
    color: "#e2f6ff",
    textAlign: "center", // Centra el texto dentro de su contenedor
    width: "100%",
  },

  // Modifica este estilo para centrar el texto dentro del botón
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center", // Centra el texto del botón si este se estira
  },

  // Modifica este para asegurar que la fila no altere el flujo
  row: {
    flexDirection: "row",
    justifyContent: "center", // Centra la fila horizontalmente
    alignItems: "center", // Centra la fila verticalmente
    marginVertical: 4, // Reduce un poco el espacio vertical si se ve muy separado
    backgroundColor: "transparent",
    width: "100%",
  },
});
