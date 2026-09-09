import { mostrarError } from "@/src/utils/errorHandler";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { obtenerCentroTrabajo } from "../../centros-trabajo/api/services";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import {
  Dispositivo,
  TipoDispositivo,
} from "../../dispositivos-fichaje/types/dispositivo-fichaje";

/**
 * Propiedades requeridas por el componente ItemDispositivo.
 */
interface ItemDispositivoProps {
  /** Objeto de dispositivo a representar e interactuar. */
  dispositivo: Dispositivo;
  /** Dispositivo que se encuentra actualmente en modo de edición, o null si ninguno lo está. */
  dispositivoEnEdicion: Dispositivo | null;
  /** Función para establecer el dispositivo en edición. */
  setDispositivoEnEdicion: (dispositivo: Dispositivo | null) => void;
  /** Función para actualizar el tipo de dispositivo seleccionado en el formulario. */
  setTipoDispositivoSeleccionado: (tipo: TipoDispositivo) => void;
  /** Función para actualizar el ID del centro de trabajo asociado en el formulario. */
  setCentroIdAsociado: (id: string) => void;
  /** Función para actualizar el estado booleano de activación del dispositivo. */
  setEstadoActivoEdicion: (activo: boolean) => void;
  /** Función para controlar la visibilidad del formulario general de creación/gestión. */
  setMostrarFormDispositivo: (mostrar: boolean) => void;
  /** Función para ejecutar la eliminación de un dispositivo por su ID. */
  handleEliminarDispositivo: (id: string) => void;
  /** Función para confirmar y guardar la edición del dispositivo. */
  handleEditarDispositivo: (dispositivo: Dispositivo) => void;
  /** Listado de tipos de dispositivos disponibles para selección. */
  TIPOS_DISPOSITIVO: { label: string; value: TipoDispositivo }[];
  /** Listado de centros de trabajo configurados en la organización. */
  centrosConfigurados: CentroTrabajo[];
  /** Tipo de dispositivo seleccionado actualmente. */
  tipoDispositivoSeleccionado: TipoDispositivo;
  /** ID del centro de trabajo asociado actualmente. */
  centroIdAsociado: string;
  /** Estado de activación actual para la edición. */
  estadoActivoEdicion: boolean;
  /** Objeto de estilos personalizados de la aplicación. */
  styles: any;
}

/**
 * Componente que representa la tarjeta visual de un dispositivo de fichaje individual,
 * permitiendo su visualización detallada, eliminación y la visualización de un formulario
 * desplegable para modificar sus atributos principales.
 *
 * @component
 * @param {ItemDispositivoProps} props - Propiedades del componente.
 */
export default function ItemDispositivo({
  dispositivo,
  dispositivoEnEdicion,
  setDispositivoEnEdicion,
  setTipoDispositivoSeleccionado,
  setCentroIdAsociado,
  setEstadoActivoEdicion,
  setMostrarFormDispositivo,
  handleEliminarDispositivo,
  handleEditarDispositivo,
  TIPOS_DISPOSITIVO,
  centrosConfigurados,
  tipoDispositivoSeleccionado,
  centroIdAsociado,
  estadoActivoEdicion,
  styles,
}: ItemDispositivoProps) {
  const [nombreCentro, setNombreCentro] = useState<string>("Cargando...");

  /**
   * Efecto secundario para obtener de forma asíncrona el nombre del centro de trabajo
   * asociado al identificador provisto en el dispositivo.
   */
  useEffect(() => {
    let montado = true;
    async function cargarCentro() {
      if (!dispositivo.centro_trabajo_id) {
        if (montado) {
          mostrarError(
            "El dispositivo actual no tiene un centro de trabajo asignado.",
          );
        }
        return;
      }
      try {
        const centroNombre = (
          await obtenerCentroTrabajo(dispositivo.centro_trabajo_id)
        ).nombre;
        if (montado) {
          setNombreCentro(centroNombre);
        }
      } catch (error: any) {
        if (montado) {
          mostrarError(
            "Error al cargar la información del centro de trabajo del dispositivo: " +
              error,
          );
        }
      }
    }
    cargarCentro();
    return () => {
      montado = false;
    };
  }, [dispositivo.centro_trabajo_id]);

  return (
    <View key={dispositivo.id}>
      {/* Contenedor principal de la fila del dispositivo */}
      <View
        style={[
          styles.itemListaEstructural,
          {
            marginBottom: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.subtextoElementoLista}>
            Tipo:{" "}
            {typeof dispositivo.tipo_dispositivo === "string"
              ? dispositivo.tipo_dispositivo.replace("_", " ")
              : dispositivo.tipo_dispositivo}{" "}
            | Centro: {nombreCentro} {"\n"}
            {dispositivo.activo !== false ? "Activo 🟢" : "Inactivo 🔴"}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          {/* Botón para alternar el modo de edición del dispositivo */}
          <Pressable
            style={{
              backgroundColor: "#475569",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              marginRight: 8,
            }}
            onPress={() => {
              if (dispositivoEnEdicion?.id === dispositivo.id) {
                setDispositivoEnEdicion(null);
              } else {
                setDispositivoEnEdicion(dispositivo);
                setTipoDispositivoSeleccionado(dispositivo.tipo_dispositivo);
                setCentroIdAsociado(dispositivo.centro_trabajo_id);
                setEstadoActivoEdicion(dispositivo.activo);
                setMostrarFormDispositivo(false);
              }
            }}
          >
            <Text>✏️</Text>
          </Pressable>
          {/* Botón para eliminar el dispositivo */}
          <Pressable
            style={{
              backgroundColor: "#fee2e2",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
            }}
            onPress={() => handleEliminarDispositivo(dispositivo.id)}
          >
            <Text style={{ color: "#ef4444" }}>🗑</Text>
          </Pressable>
        </View>
      </View>

      {/* Formulario de Edición desplegable condicional */}
      {dispositivoEnEdicion?.id === dispositivo.id && (
        <View style={styles.contenedorFormDesplegado}>
          <Text style={styles.formularioTitulo}>Editar Dispositivo</Text>

          {/* Selector horizontal para modificar el tipo de dispositivo */}
          <View style={styles.campoFormulario}>
            <Text style={styles.labelInput}>Tipo de Dispositivo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIPOS_DISPOSITIVO.map((tipo) => {
                const seleccionado = tipoDispositivoSeleccionado === tipo.value;
                return (
                  <Pressable
                    key={tipo.value}
                    style={[
                      styles.chipAno,
                      seleccionado && { backgroundColor: "#2563EB" },
                    ]}
                    onPress={() => setTipoDispositivoSeleccionado(tipo.value)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: seleccionado ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {tipo.label} {seleccionado ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Selector horizontal para modificar el centro de trabajo asociado */}
          <View style={styles.campoFormulario}>
            <Text style={styles.labelInput}>Centro de Trabajo Asociado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {centrosConfigurados?.map((centro) => {
                const esEsteCentro = centroIdAsociado === centro.id;
                return (
                  <Pressable
                    key={centro.id}
                    style={[
                      styles.chipAno,
                      esEsteCentro && { backgroundColor: "#2563EB" },
                    ]}
                    onPress={() => setCentroIdAsociado(centro.id)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: esEsteCentro ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {centro.nombre} {esEsteCentro ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Botón interactivo para alternar el estado activo/inactivo del dispositivo */}
          <View style={styles.campoFormulario}>
            <Text style={styles.labelInput}>Estado</Text>
            <Pressable
              style={[
                styles.chipAno,
                {
                  backgroundColor: estadoActivoEdicion ? "#10B981" : "#EF4444",
                },
              ]}
              onPress={() => setEstadoActivoEdicion(!estadoActivoEdicion)}
            >
              <Text
                style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 12 }}
              >
                {estadoActivoEdicion
                  ? "Activo (Permitir fichajes) ✓"
                  : "Inactivo (Bloqueado) ✕"}
              </Text>
            </Pressable>
          </View>

          {/* Botón de acción para actualizar los cambios en el dispositivo */}
          <Pressable
            style={[
              styles.botonGuardar,
              { backgroundColor: "#2563EB", marginTop: 10 },
            ]}
            onPress={() => {
              handleEditarDispositivo({
                ...dispositivo,
                tipo_dispositivo: tipoDispositivoSeleccionado,
                centro_trabajo_id: centroIdAsociado,
                activo: estadoActivoEdicion,
              });
              setDispositivoEnEdicion(null);
            }}
          >
            <Text style={styles.textoBotonGuardar}>Actualizar Cambios</Text>
          </Pressable>

          {/* Botón para cancelar la edición y cerrar el formulario */}
          <Pressable
            onPress={() => setDispositivoEnEdicion(null)}
            style={{ marginTop: 15 }}
          >
            <Text style={{ textAlign: "center", color: "#64748B" }}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
