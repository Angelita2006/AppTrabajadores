import { ThemedText } from "@/src/shared/components/themed-text";
import { Row } from "@/src/shared/ui/AppSurface";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Switch,
  TextInput,
  View,
} from "react-native";
import {
  crearCentroTrabajo,
  editarCentroTrabajo,
  eliminarCentroTrabajo,
} from "../../centros-trabajo/api/services";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import MapaCentroSelector from "./MapaCentroSelector";

export default function TabCentros({
  centrosEmpresa,
  setCentrosEmpresa,
  empresaSeleccionada,
  latitudCentro,
  setLatitudCentro,
  longitudCentro,
  setLongitudCentro,
  guardando,
  setGuardando,
  styles,
}: any) {
  const [mostrarFormCentro, setMostrarFormCentro] = useState(false);

  const [nombreCentro, setNombreCentro] = useState("");
  const [direccionCentro, setDireccionCentro] = useState("");
  const [activoCentro, setActivoCentro] = useState(false);
  const [zonaHoraria, setZonaHoraria] = useState("Europe/Madrid");
  const [codigoCcc, setCodigoCcc] = useState("");
  const [centroEnEdicion, setCentroEnEdicion] = useState<CentroTrabajo | null>(
    null,
  );

  const handleCrearCentro = async () => {
    if (!nombreCentro || !zonaHoraria || !empresaSeleccionada) {
      if (Platform.OS === "web") {
        alert(
          "Campos incompletos: Por favor introduce el nombre y la zona horaria del centro.",
        );
      } else {
        Alert.alert(
          "Campos incompletos",
          "Por favor introduce el nombre y la zona horaria del centro.",
        );
      }
      return;
    }
    try {
      setGuardando(true);
      await crearCentroTrabajo({
        empresa_id: empresaSeleccionada.id,
        nombre: nombreCentro.trim(),
        activo: true,
        zona_horaria: zonaHoraria.trim(),
        direccion: direccionCentro.trim() || null,
        codigo_ccc: codigoCcc.trim() || null,
        latitud: latitudCentro,
        longitud: longitudCentro,
      });

      setNombreCentro("");
      setDireccionCentro("");
      setCodigoCcc("");
      setActivoCentro(false);
      setZonaHoraria("Europe/Madrid");
      setCentroEnEdicion(null);
      setMostrarFormCentro(false);
      setLatitudCentro(0);
      setLongitudCentro(0);
      // await cargarDatosEmpresa(empresaSeleccionada.id);
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarCentro = async (centro: CentroTrabajo) => {
    try {
      setGuardando(true);
      await editarCentroTrabajo(centro.id, {
        nombre: nombreCentro,
        activo: activoCentro,
        direccion: direccionCentro,
        codigo_ccc: codigoCcc,
        zona_horaria: zonaHoraria,
        latitud: latitudCentro,
        longitud: longitudCentro,
      });

      setCentrosEmpresa((prev: CentroTrabajo[]) =>
        prev.map((c: CentroTrabajo) =>
          c.id === centro.id
            ? {
                ...c,
                nombre: nombreCentro,
                activo: activoCentro,
                direccion: direccionCentro,
                codigo_ccc: codigoCcc,
                zona_horaria: zonaHoraria,
                latitud: latitudCentro,
                longitud: longitudCentro,
              }
            : c,
        ),
      );

      Alert.alert("Éxito", "Centro de trabajo actualizado.");
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE CENTROS DE TRABAJO
  // ==========================================
  const handleEliminarCentro = async (
    centroId: string,
    nombreCentro: string = "este centro",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarCentroTrabajo(centroId);
        setCentrosEmpresa((prev: CentroTrabajo[]) =>
          prev.filter((c: CentroTrabajo) => c.id !== centroId),
        );
        Alert.alert("Éxito", "Centro de trabajo eliminado correctamente.");
      } catch (error: any) {
        const mensajeAmigable = obtenerMensajeAmigableError(error);
        if (Platform.OS === "web") {
          alert(`${mensajeAmigable}`);
        } else {
          Alert.alert(
            mensajeAmigable ||
              `No se puede eliminar el centro porque tiene contratos de trabajadores activos asociados. Rescinda los contratos primero.`,
          );
        }
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmado = window.confirm(
        `¿Deseas eliminar el centro de trabajo "${nombreCentro}"? Se comprobarán contratos vigentes.`,
      );
      if (confirmado) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        `¿Deseas eliminar el centro de trabajo "${nombreCentro}"? Se comprobarán contratos vigentes.`,
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

  return (
    <View>
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormCentro ? "#64748B" : "#EA580C",
          },
        ]}
        onPress={() => {
          if (!mostrarFormCentro) {
            setNombreCentro("");
            setDireccionCentro("");
            setZonaHoraria("");
            setCodigoCcc("");
          }
          setMostrarFormCentro(!mostrarFormCentro);
          setCentroEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormCentro ? "✕ Cancelar" : "＋ Añadir Centro de Trabajo"}
        </ThemedText>
      </Pressable>

      {mostrarFormCentro && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Dar de Alta Centro de Trabajo
          </ThemedText>
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Nombre del Centro *
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={nombreCentro}
              onChangeText={setNombreCentro}
              placeholder="Ej. Sede Principal"
            />
          </View>
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Dirección del Centro
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={direccionCentro}
              onChangeText={setDireccionCentro}
              placeholder="Ej. Calle Mayor 12"
            />
          </View>
          <Row>
            <View style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}>
              <ThemedText style={styles.labelInput}>Zona Horaria *</ThemedText>
              <TextInput
                style={styles.inputForm}
                value={zonaHoraria}
                onChangeText={setZonaHoraria}
                placeholder="Ej. Europe/Madrid"
              />
            </View>
            <View style={[styles.campoFormulario, { flex: 1 }]}>
              <ThemedText style={styles.labelInput}>Código CCC</ThemedText>
              <TextInput
                style={styles.inputForm}
                value={codigoCcc}
                onChangeText={setCodigoCcc}
                keyboardType="numeric"
                placeholder="Código de cuenta"
              />
            </View>
          </Row>

          <MapaCentroSelector
            latitudCentro={latitudCentro}
            longitudCentro={longitudCentro}
            setLatitudCentro={setLatitudCentro}
            setLongitudCentro={setLongitudCentro}
            styles={styles}
          />

          <Pressable
            style={[styles.botonGuardar, { backgroundColor: "#EA580C" }]}
            onPress={handleCrearCentro}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              Guardar Centro
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>
        Centros Registrados
      </ThemedText>

      {centrosEmpresa.map((centro: CentroTrabajo) => (
        <View key={centro.id}>
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
              <ThemedText style={styles.nombreElementoLista}>
                {centro.nombre}
              </ThemedText>
              <ThemedText style={styles.subtextoElementoLista}>
                {centro.direccion || "Sin dirección"} • {centro.zona_horaria}
              </ThemedText>
            </View>

            <Row>
              <Pressable
                style={{
                  backgroundColor: "#475569",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                }}
                onPress={() => {
                  if (centroEnEdicion?.id === centro.id) {
                    setCentroEnEdicion(null);
                  } else {
                    setCentroEnEdicion(centro);
                    setNombreCentro(centro.nombre);
                    setActivoCentro(centro.activo);
                    setDireccionCentro(centro.direccion || "");
                    setZonaHoraria(centro.zona_horaria || "");
                    setCodigoCcc(centro.codigo_ccc?.toString() || "");
                    setLatitudCentro(centro.latitud);
                    setLongitudCentro(centro.longitud);
                    setMostrarFormCentro(false);
                  }
                }}
              >
                <ThemedText>✏️</ThemedText>
              </Pressable>

              <Pressable
                style={{
                  backgroundColor: "#fee2e2",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                }}
                onPress={() => {
                  handleEliminarCentro(centro.id);
                }}
              >
                <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
              </Pressable>
            </Row>
          </View>

          {centroEnEdicion?.id === centro.id && (
            <View style={styles.contenedorFormDesplegado}>
              <ThemedText style={styles.formularioTitulo}>
                Editar Centro
              </ThemedText>
              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>
                  Nombre del Centro
                </ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={nombreCentro}
                  onChangeText={setNombreCentro}
                />
              </View>
              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>Dirección</ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={direccionCentro}
                  onChangeText={setDireccionCentro}
                />
              </View>
              <Row>
                <View
                  style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}
                >
                  <ThemedText style={styles.labelInput}>
                    Zona Horaria
                  </ThemedText>
                  <TextInput
                    style={styles.inputForm}
                    value={zonaHoraria}
                    onChangeText={setZonaHoraria}
                  />
                </View>
                <View style={[styles.campoFormulario, { flex: 1 }]}>
                  <ThemedText style={styles.labelInput}>Código CCC</ThemedText>
                  <TextInput
                    style={styles.inputForm}
                    value={codigoCcc}
                    onChangeText={setCodigoCcc}
                    keyboardType="numeric"
                  />
                </View>
              </Row>

              <View
                style={[
                  styles.campoFormulario,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <ThemedText style={styles.labelInput}>
                  ¿Centro Activo?
                </ThemedText>
                <Switch
                  value={activoCentro}
                  onValueChange={setActivoCentro}
                  trackColor={{ false: "#767577", true: "#EA580C" }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <MapaCentroSelector
                  latitudCentro={latitudCentro}
                  longitudCentro={longitudCentro}
                  setLatitudCentro={setLatitudCentro}
                  setLongitudCentro={setLongitudCentro}
                  styles={styles}
                />
              </View>

              <Pressable
                style={[
                  styles.botonGuardar,
                  { backgroundColor: "#EA580C", marginTop: 10 },
                ]}
                onPress={() => {
                  handleEditarCentro(centro);
                  setCentroEnEdicion(null);
                }}
                disabled={guardando}
              >
                <ThemedText style={styles.textoBotonGuardar}>
                  Actualizar Cambios
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setCentroEnEdicion(null)}
                style={{ marginTop: 15 }}
              >
                <ThemedText style={{ textAlign: "center", color: "#64748B" }}>
                  Cancelar edición
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
