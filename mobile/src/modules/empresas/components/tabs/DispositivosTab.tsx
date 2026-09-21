import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import React, { useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import { CentroTrabajo } from "../../../centros-trabajo/types/centro-trabajo";
import {
  crearDispositivo,
  editarDispositivo,
  eliminarDispositivo,
} from "../../../dispositivos-fichaje/api/services";
import {
  Dispositivo,
  TIPOS_DISPOSITIVO,
  TipoDispositivo,
} from "../../../dispositivos-fichaje/types/dispositivo-fichaje";
import { Empresa } from "../../types/empresa";
import ItemDispositivo from "../ItemDispositivo";

/**
 * Propiedades requeridas por el componente TabDispositivos.
 */
interface TabDispositivosProps {
  /** Listado de dispositivos de fichaje configurados para la empresa. */
  dispositivosEmpresa: Dispositivo[];
  /** Función para actualizar el estado del listado de dispositivos. */
  setDispositivosEmpresa: React.Dispatch<React.SetStateAction<Dispositivo[]>>;
  /** Listado de centros de trabajo asociados a la empresa. */
  centrosEmpresa: CentroTrabajo[];
  /** Objeto que representa la empresa seleccionada actualmente. */
  empresaActual: Empresa | null;
  /** Estado booleano que indica si se está ejecutando una operación de guardado/carga. */
  guardando: boolean;
  /** Función para actualizar el estado de guardado. */
  setGuardando: (guardando: boolean) => void;
  /** Objeto de estilos personalizados de la aplicación. */
  styles: any;
}

/**
 * Componente que gestiona la pestaña de dispositivos de fichaje de una empresa,
 * permitiendo listar, vincular, editar y eliminar dispositivos por centro de trabajo.
 *
 * @component
 * @param {TabDispositivosProps} props - Propiedades del componente.
 */
export default function TabDispositivos({
  dispositivosEmpresa,
  setDispositivosEmpresa,
  centrosEmpresa,
  empresaActual,
  guardando,
  setGuardando,
  styles,
}: TabDispositivosProps) {
  const [mostrarFormDispositivo, setMostrarFormDispositivo] = useState(false);
  const [mostrarPapelera, setMostrarPapelera] = useState(false);
  const [dispositivoEnEdicion, setDispositivoEnEdicion] =
    useState<Dispositivo | null>(null);
  const [centroIdAsociado, setCentroIdAsociado] = useState("");

  const [tipoDispositivoSeleccionado, setTipoDispositivoSeleccionado] =
    useState<TipoDispositivo>(TIPOS_DISPOSITIVO.APP_MOVIL);
  const [estadoActivoEdicion, setEstadoActivoEdicion] = useState<boolean>(true);

  const dispositivosActivos = dispositivosEmpresa.filter(
    (dispositivo) => dispositivo.activo !== false,
  );
  const dispositivosInactivos = dispositivosEmpresa.filter(
    (dispositivo) => dispositivo.activo === false,
  );

  const { mostrarError, mostrarMensaje } = useAppModal();

  // ==========================================
  // REFERENCIAS PARA FOCO Y GESTIÓN
  // ==========================================
  const contenedorFormRef = useRef<View | null>(null);

  /**
   * Ejecuta la creación de un nuevo dispositivo de fichaje asociado a un centro de trabajo.
   */
  const handleCrearDispositivo = async () => {
    if (!centroIdAsociado.trim() || !empresaActual?.id) {
      mostrarMensaje(
        "Campos incompletos",
        "Por favor, elige un centro para el dispositivo.",
      );
      return;
    }

    try {
      setGuardando(true);
      const nuevoDispositivo = await crearDispositivo({
        empresa_id: empresaActual.id,
        tipo_dispositivo: tipoDispositivoSeleccionado,
        centro_trabajo_id: centroIdAsociado.trim(),
        activo: true,
      });

      setDispositivosEmpresa((prev: Dispositivo[]) => [
        ...prev,
        nuevoDispositivo,
      ]);
      setTipoDispositivoSeleccionado(TIPOS_DISPOSITIVO.APP_MOVIL);
      setCentroIdAsociado("");
      setMostrarFormDispositivo(false);
      mostrarMensaje("Éxito", "Dispositivo registrado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al crear el dispositivo de fichaje: " + error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Ejecuta la actualización de los datos de un dispositivo de fichaje existente.
   * @param {Dispositivo} dispositivo - Objeto con los datos del dispositivo a editar.
   */
  const handleEditarDispositivo = async (dispositivo: Dispositivo) => {
    if (!centroIdAsociado.trim()) {
      mostrarMensaje(
        "Campos incompletos",
        "Por favor, elige un centro para el dispositivo.",
      );
      return;
    }

    try {
      setGuardando(true);
      await editarDispositivo(dispositivo.id, {
        tipo_dispositivo: tipoDispositivoSeleccionado,
        centro_trabajo_id: centroIdAsociado.trim(),
        activo: estadoActivoEdicion,
      });

      setDispositivosEmpresa((prev: Dispositivo[]) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((d: Dispositivo) =>
          d.id === dispositivo.id
            ? {
                ...d,
                tipo_dispositivo: tipoDispositivoSeleccionado,
                centro_trabajo_id: centroIdAsociado.trim(),
                activo: estadoActivoEdicion,
              }
            : d,
        );
      });

      setDispositivoEnEdicion(null);
      setCentroIdAsociado("");

      mostrarMensaje("Éxito", "Dispositivo actualizado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al actualizar el dispositivo de fichaje: " + error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Controla el flujo de eliminación de un dispositivo de fichaje por su identificador.
   * @param {string} dispositivoId - ID único del dispositivo a eliminar.
   * @param {string} [nombreDisp="este dispositivo"] - Nombre descriptivo del dispositivo para la confirmación.
   */
  const handleEliminarDispositivo = async (
    dispositivoId: string,
    nombreDisp: string = "este dispositivo",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarDispositivo(dispositivoId);
        setDispositivosEmpresa((prev: Dispositivo[]) =>
          prev.map((d: Dispositivo) =>
            d.id === dispositivoId ? { ...d, activo: false } : d,
          ),
        );
        mostrarMensaje("Éxito", "Dispositivo enviado a la papelera.");
      } catch (error: any) {
        mostrarError(
          "Error al eliminar el dispositivo de fichaje: " + error.message,
        );
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`¿Deseas eliminar el dispositivo "${nombreDisp}"?`)) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        `¿Deseas eliminar el dispositivo "${nombreDisp}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: ejecutarEliminacion,
          },
        ],
      );
    }
  };

  const handleReactivarDispositivo = async (dispositivoId: string) => {
    try {
      setGuardando(true);
      await editarDispositivo(dispositivoId, { activo: true });
      setDispositivosEmpresa((prev) =>
        prev.map((dispositivo) =>
          dispositivo.id === dispositivoId
            ? { ...dispositivo, activo: true }
            : dispositivo,
        ),
      );
      mostrarMensaje("Éxito", "Dispositivo reactivado correctamente.");
    } catch (error: any) {
      mostrarError("Error al reactivar el dispositivo: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const tieneCentrosValidos =
    Array.isArray(centrosEmpresa) &&
    centrosEmpresa.some((centro) => centro.activo === true);

  return (
    <View>
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormDispositivo ? "#64748B" : "#2563EB",
          },
        ]}
        onPress={() => {
          if (!mostrarFormDispositivo) {
            setTipoDispositivoSeleccionado(TIPOS_DISPOSITIVO.APP_MOVIL);
            setCentroIdAsociado("");
          }
          setMostrarFormDispositivo(!mostrarFormDispositivo);
          setDispositivoEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormDispositivo ? "✕ Cancelar" : "＋ Vincular Dispositivo"}
        </ThemedText>
      </Pressable>

      {mostrarFormDispositivo && (
        <View ref={contenedorFormRef} style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Configurar Nuevo Dispositivo
          </ThemedText>

          {/* Selector de Tipo de Dispositivo */}
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Tipo de Dispositivo *
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 4 }}
            >
              {Object.values(TIPOS_DISPOSITIVO).map((tipoValue) => {
                const seleccionado = tipoDispositivoSeleccionado === tipoValue;
                return (
                  <Pressable
                    key={tipoValue}
                    style={[
                      styles.chipAno,
                      seleccionado && {
                        backgroundColor: "#2563EB",
                      },
                    ]}
                    onPress={() => setTipoDispositivoSeleccionado(tipoValue)}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: seleccionado ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {tipoValue.toString().replace("_", " ")}{" "}
                      {seleccionado ? "✓" : ""}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Selector de Centro de Trabajo Asociado */}
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Centro de Trabajo Asociado
            </ThemedText>

            {!tieneCentrosValidos ? (
              <View style={styles.bannerError}>
                <ThemedText style={styles.textoBannerError}>
                  ⚠️ No existen centros de trabajo registrados.
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 4 }}
              >
                {centrosEmpresa
                  .filter((centro) => centro.activo === true)
                  .map((centro: CentroTrabajo) => {
                    const esEsteCentro = centroIdAsociado === centro.id;
                    return (
                      <Pressable
                        key={centro.id}
                        style={[
                          styles.chipAno,
                          esEsteCentro && {
                            backgroundColor: "#2563EB",
                          },
                        ]}
                        onPress={() => setCentroIdAsociado(centro.id)}
                      >
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: esEsteCentro ? "#FFFFFF" : "#475569",
                          }}
                        >
                          {centro.nombre} {esEsteCentro ? "✓" : ""}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            )}
          </View>

          <Pressable
            style={[styles.botonGuardar, { backgroundColor: "#2563EB" }]}
            onPress={handleCrearDispositivo}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              Guardar Dispositivo
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>
        Dispositivos Activos
      </ThemedText>

      {dispositivosActivos.map((dispositivo: Dispositivo) => (
        <ItemDispositivo
          key={dispositivo.id}
          dispositivo={dispositivo}
          dispositivoEnEdicion={dispositivoEnEdicion}
          setDispositivoEnEdicion={setDispositivoEnEdicion}
          setTipoDispositivoSeleccionado={setTipoDispositivoSeleccionado}
          setCentroIdAsociado={setCentroIdAsociado}
          setEstadoActivoEdicion={setEstadoActivoEdicion}
          setMostrarFormDispositivo={setMostrarFormDispositivo}
          handleEditarDispositivo={handleEditarDispositivo}
          handleEliminarDispositivo={handleEliminarDispositivo}
          TIPOS_DISPOSITIVO={Object.values(TIPOS_DISPOSITIVO).map((val) => ({
            label: val,
            value: val,
          }))}
          centrosConfigurados={centrosEmpresa.filter(
            (centro) => centro.activo === true,
          )}
          tipoDispositivoSeleccionado={tipoDispositivoSeleccionado}
          centroIdAsociado={centroIdAsociado}
          estadoActivoEdicion={estadoActivoEdicion}
          styles={styles}
        />
      ))}

      {dispositivosInactivos.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Pressable
            style={[styles.botonAccionHeader, { backgroundColor: "#64748B" }]}
            onPress={() => setMostrarPapelera(!mostrarPapelera)}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              {mostrarPapelera
                ? "📂 Ocultar Papelera"
                : `🗑 Ver Papelera (${dispositivosInactivos.length})`}
            </ThemedText>
          </Pressable>
          {mostrarPapelera &&
            dispositivosInactivos.map((dispositivo) => (
              <View key={dispositivo.id} style={styles.itemListaEstructural}>
                <ThemedText style={styles.nombreElementoLista}>
                  {dispositivo.tipo_dispositivo}
                </ThemedText>
                <Pressable
                  style={[styles.botonGuardar, { backgroundColor: "#16A34A" }]}
                  onPress={() => handleReactivarDispositivo(dispositivo.id)}
                  disabled={guardando}
                >
                  <ThemedText style={styles.textoBotonGuardar}>
                    ↻ Reactivar
                  </ThemedText>
                </Pressable>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
