import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { obtenerCentroTrabajo } from "../../centros-trabajo/api/services";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import { Dispositivo } from "../../dispositivos-fichaje/types/dispositivo-fichaje";
// Asegúrate de importar 'ThemedText' y 'Row' según la ruta real de tu proyecto
// import { ThemedText } from '@/components/ThemedText';
// import { Row } from '@/components/Row';

interface ItemDispositivoProps {
  dispositivo: Dispositivo;
  dispositivoEnEdicion: Dispositivo | null;
  setDispositivoEnEdicion: (disp: Dispositivo | null) => void;
  setTipoDispositivoSeleccionado: (tipo: string) => void;
  setCentroIdAsociado: (id: string) => void;
  setEstadoActivoEdicion: (activo: boolean) => void;
  setMostrarFormDispositivo: (mostrar: boolean) => void;
  handleEliminarDispositivo: (id: string) => void;
  handleEditarDispositivo: (disp: Dispositivo) => void;
  TIPOS_DISPOSITIVOS: any[];
  centrosConfigurados: CentroTrabajo[];
  tipoDispositivoSeleccionado: string;
  centroIdAsociado: string;
  estadoActivoEdicion: boolean;
  styles: any;
}

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
  TIPOS_DISPOSITIVOS,
  centrosConfigurados,
  tipoDispositivoSeleccionado,
  centroIdAsociado,
  estadoActivoEdicion,
  styles,
}: ItemDispositivoProps) {
  const [nombreCentro, setNombreCentro] = useState<string>("Cargando...");

  useEffect(() => {
    let montado = true;
    async function cargarCentro() {
      if (!dispositivo.centro_trabajo_id) {
        if (montado) setNombreCentro("Sin centro asignado");
        return;
      }
      try {
        const centroNombre = (
          await obtenerCentroTrabajo(dispositivo.centro_trabajo_id)
        ).nombre;
        if (montado) {
          setNombreCentro(centroNombre || "Centro no encontrado");
        }
      } catch (error) {
        if (montado) setNombreCentro("Error al cargar");
      }
    }
    cargarCentro();
    return () => {
      montado = false;
    };
  }, [dispositivo.centro_trabajo_id]);

  return (
    <View key={dispositivo.id}>
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
          {/* Reemplaza ThemedText por el componente de texto que uses en tu app */}
          <Text style={styles.subtextoElementoLista}>
            Tipo: {dispositivo.tipo_dispositivo.replace("_", " ")} | Centro:{" "}
            {nombreCentro} {"\n"}
            {dispositivo.activo !== false ? "Activo 🟢" : "Inactivo 🔴"}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
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
                setTipoDispositivoSeleccionado(
                  dispositivo.tipo_dispositivo || "App_móvil",
                );
                setCentroIdAsociado(dispositivo.centro_trabajo_id || "");
                setEstadoActivoEdicion(dispositivo.activo ?? true);
                setMostrarFormDispositivo(false);
              }
            }}
          >
            <Text>✏️</Text>
          </Pressable>
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

      {/* Formulario de Edición */}
      {dispositivoEnEdicion?.id === dispositivo.id && (
        <View style={styles.contenedorFormDesplegado}>
          <Text style={styles.formularioTitulo}>Editar Dispositivo</Text>

          {/* Modificar Tipo de Dispositivo en Edición */}
          <View style={styles.campoFormulario}>
            <Text style={styles.labelInput}>Tipo de Dispositivo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIPOS_DISPOSITIVOS?.map((tipo: any) => {
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

          {/* Modificar Centro de Trabajo en Edición */}
          <View style={styles.campoFormulario}>
            <Text style={styles.labelInput}>Centro de Trabajo Asociado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {centrosConfigurados?.map((centro: any) => {
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

          {/* Modificar Estado Activo en Edición */}
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

          <Pressable
            style={[
              styles.botonGuardar,
              { backgroundColor: "#2563EB", marginTop: 10 },
            ]}
            onPress={() => {
              handleEditarDispositivo({
                ...dispositivo,
                tipo_dispositivo: tipoDispositivoSeleccionado,
                centro_trabajo_id: centroIdAsociado || null,
                activo: estadoActivoEdicion,
              });
              setDispositivoEnEdicion(null);
            }}
          >
            <Text style={styles.textoBotonGuardar}>Actualizar Cambios</Text>
          </Pressable>

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
