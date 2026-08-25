import { ThemedText } from "@/src/shared/components/themed-text";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import {
  crearDispositivo,
  editarDispositivo,
  eliminarDispositivo,
} from "../../dispositivos-fichaje/api/services";
import {
  Dispositivo,
  TIPOS_DISPOSITIVOS,
} from "../../dispositivos-fichaje/types/dispositivo-fichaje";
import ItemDispositivo from "./ItemDispositivo";

export default function TabDispositivos({
  dispositivosEmpresa,
  setDispositivosEmpresa,
  centrosEmpresa,
  empresaSeleccionada,
  guardando,
  setGuardando,
  styles,
}: any) {
  const [mostrarFormDispositivo, setMostrarFormDispositivo] = useState(false);
  const [dispositivoEnEdicion, setDispositivoEnEdicion] =
    useState<Dispositivo | null>(null);
  const [centroIdAsociado, setCentroIdAsociado] = useState("");

  const [tipoDispositivoSeleccionado, setTipoDispositivoSeleccionado] =
    useState("App_móvil");
  const [estadoActivoEdicion, setEstadoActivoEdicion] = useState<boolean>(true);

  // ==========================================
  // CREACIÓN DE DISPOSITIVOS
  // ==========================================
  const handleCrearDispositivo = async () => {
    if (!centroIdAsociado.trim() || !empresaSeleccionada?.id) {
      const msg = "Por favor, elige un centro para el dispositivo.";
      Platform.OS === "web"
        ? alert(msg)
        : Alert.alert("Campos incompletos", msg);
      return;
    }

    try {
      setGuardando(true);
      const nuevoDispositivo = await crearDispositivo({
        empresa_id: empresaSeleccionada.id,
        tipo_dispositivo: tipoDispositivoSeleccionado,
        centro_trabajo_id: centroIdAsociado.trim() || null,
        activo: true,
      });

      setDispositivosEmpresa((prev: Dispositivo[]) => [
        ...prev,
        nuevoDispositivo,
      ]);
      setTipoDispositivoSeleccionado("App_móvil");
      setCentroIdAsociado("");
      setMostrarFormDispositivo(false);
      Alert.alert("Éxito", "Dispositivo registrado correctamente.");
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      Platform.OS === "web"
        ? alert(`Error: ${mensajeAmigable}`)
        : Alert.alert("Error", mensajeAmigable);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // EDICIÓN DE DISPOSITIVOS
  // ==========================================
  const handleEditarDispositivo = async (dispositivo: Dispositivo) => {
    if (!centroIdAsociado.trim()) {
      const msg = "Por favor, elige un centro para el dispositivo.";
      Platform.OS === "web"
        ? alert(msg)
        : Alert.alert("Campos incompletos", msg);
      return;
    }

    try {
      setGuardando(true);
      await editarDispositivo(dispositivo.id, {
        tipo_dispositivo: tipoDispositivoSeleccionado,
        centro_trabajo_id: centroIdAsociado.trim() || null,
        activo: dispositivo.activo,
      });

      setDispositivosEmpresa((prev: Dispositivo[]) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((d: Dispositivo) =>
          d.id === dispositivo.id
            ? {
                ...d,
                tipo_dispositivo: tipoDispositivoSeleccionado,
                centro_trabajo_id: centroIdAsociado.trim() || null,
                activo: dispositivo.activo,
              }
            : d,
        );
      });

      setDispositivoEnEdicion(null);
      setCentroIdAsociado("");

      Alert.alert("Éxito", "Dispositivo actualizado correctamente.");
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      Platform.OS === "web"
        ? alert(`Error: ${mensajeAmigable}`)
        : Alert.alert("Error", mensajeAmigable);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE DISPOSITIVOS
  // ==========================================
  const handleEliminarDispositivo = async (
    dispositivoId: string,
    nombreDisp: string = "este dispositivo",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarDispositivo(dispositivoId);
        setDispositivosEmpresa((prev: Dispositivo[]) =>
          prev.filter((d: Dispositivo) => d.id !== dispositivoId),
        );
        Alert.alert("Éxito", "Dispositivo eliminado correctamente.");
      } catch (error: any) {
        const mensajeAmigable = obtenerMensajeAmigableError(error);
        Platform.OS === "web"
          ? alert(`${mensajeAmigable}`)
          : Alert.alert("Error", mensajeAmigable);
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

  const tieneCentrosValidos =
    Array.isArray(centrosEmpresa) && centrosEmpresa.length > 0;

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
            setTipoDispositivoSeleccionado("App_móvil");
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
        <View style={styles.contenedorFormDesplegado}>
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
              {TIPOS_DISPOSITIVOS.map((tipo) => {
                const seleccionado = tipoDispositivoSeleccionado === tipo.value;
                return (
                  <Pressable
                    key={tipo.value}
                    style={[
                      styles.chipAno,
                      seleccionado && {
                        backgroundColor: "#2563EB",
                      },
                    ]}
                    onPress={() => setTipoDispositivoSeleccionado(tipo.value)}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: seleccionado ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {tipo.label} {seleccionado ? "✓" : ""}
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
                {centrosEmpresa.map((centro: CentroTrabajo) => {
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
        Dispositivos Registrados
      </ThemedText>

      {dispositivosEmpresa?.map((dispositivo: Dispositivo) => (
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
          TIPOS_DISPOSITIVOS={TIPOS_DISPOSITIVOS}
          centrosConfigurados={centrosEmpresa}
          tipoDispositivoSeleccionado={tipoDispositivoSeleccionado}
          centroIdAsociado={centroIdAsociado}
          estadoActivoEdicion={estadoActivoEdicion}
          styles={styles}
        />
      ))}
    </View>
  );
}
