import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { Row } from "@/src/shared/ui/AppSurface";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Switch,
  TextInput,
  View,
} from "react-native";
import {
  actualizarCentroTrabajo,
  cambiarEstadoCentroTrabajo,
  crearCentroTrabajo,
  eliminarCentroTrabajo,
} from "../../../centros-trabajo/api/services";
import { CentroTrabajo } from "../../../centros-trabajo/types/centro-trabajo";
import { Empresa } from "../../types/empresa";
import MapaCentroSelector from "../MapaCentroSelector";

interface TabCentrosProps {
  centrosEmpresa: CentroTrabajo[];
  setCentrosEmpresa: React.Dispatch<React.SetStateAction<CentroTrabajo[]>>;
  empresaActual: Empresa | null;
  guardando: boolean;
  setGuardando: (guardando: boolean) => void;
  styles: any;
}

export default function TabCentros({
  centrosEmpresa,
  setCentrosEmpresa,
  empresaActual,
  guardando,
  setGuardando,
  styles,
}: TabCentrosProps) {
  const [mostrarFormCentro, setMostrarFormCentro] = useState(false);
  const [mostrarPapelera, setMostrarPapelera] = useState(false);

  const [nombreCentro, setNombreCentro] = useState("");
  const [direccionCentro, setDireccionCentro] = useState("");
  const [activoCentro, setActivoCentro] = useState(false);
  const [zonaHoraria, setZonaHoraria] = useState("Europe/Madrid");
  const [codigoCcc, setCodigoCcc] = useState("");
  const [centroEnEdicion, setCentroEnEdicion] = useState<CentroTrabajo | null>(
    null,
  );
  const [latitudCentro, setLatitudCentro] = useState(0.0);
  const [longitudCentro, setLongitudCentro] = useState(0.0);

  // ==========================================
  // REFERENCIAS PARA CREACIÓN Y EDICIÓN
  // ==========================================
  const crearDireccionRef = useRef<TextInput | null>(null);
  const crearZonaRef = useRef<TextInput | null>(null);
  const crearCccRef = useRef<TextInput | null>(null);

  const editarDireccionRef = useRef<TextInput | null>(null);
  const editarZonaRef = useRef<TextInput | null>(null);
  const editarCccRef = useRef<TextInput | null>(null);

  const centrosActivos = centrosEmpresa.filter(
    (centro) => centro.activo !== false,
  );
  const centrosInactivos = centrosEmpresa.filter(
    (centro) => centro.activo === false,
  );

  const { mostrarError, mostrarMensaje } = useAppModal();

  // ==========================================
  // CREACIÓN DE CENTROS DE TRABAJO
  // ==========================================
  const handleCrearCentro = async () => {
    if (!nombreCentro.trim() || !zonaHoraria.trim() || !empresaActual?.id) {
      mostrarMensaje(
        "Campos incompletos",
        "Por favor introduce el nombre y la zona horaria del centro.",
      );
      return;
    }

    try {
      setGuardando(true);
      const nuevoCentro = await crearCentroTrabajo({
        empresa_id: empresaActual.id,
        nombre: nombreCentro.trim(),
        activo: true,
        zona_horaria: zonaHoraria.trim(),
        direccion: direccionCentro.trim(),
        codigo_ccc: codigoCcc.trim(),
        latitud: latitudCentro,
        longitud: longitudCentro,
      });

      setCentrosEmpresa([...centrosEmpresa, nuevoCentro]);
      setNombreCentro("");
      setDireccionCentro("");
      setCodigoCcc("");
      setActivoCentro(false);
      setZonaHoraria("Europe/Madrid");
      setCentroEnEdicion(null);
      setMostrarFormCentro(false);
      setLatitudCentro(0);
      setLongitudCentro(0);
      mostrarMensaje("Éxito", "Centro de trabajo creado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al crear el centro de trabajo: " +
          obtenerMensajeAmigableError(error.message),
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // EDICIÓN DE CENTROS DE TRABAJO
  // ==========================================
  const handleEditarCentro = async (centro: CentroTrabajo) => {
    if (!nombreCentro.trim() || !zonaHoraria.trim()) {
      mostrarMensaje(
        "Campos incompletos",
        "Por favor introduce el nombre y la zona horaria del centro.",
      );
      return;
    }

    try {
      setGuardando(true);
      await actualizarCentroTrabajo(centro.id, {
        nombre: nombreCentro.trim(),
        activo: activoCentro,
        direccion: direccionCentro.trim(),
        codigo_ccc: codigoCcc.trim(),
        zona_horaria: zonaHoraria.trim(),
        latitud: latitudCentro,
        longitud: longitudCentro,
      });

      setCentrosEmpresa((prev: CentroTrabajo[]) =>
        prev.map((c: CentroTrabajo) =>
          c.id === centro.id
            ? {
                ...c,
                nombre: nombreCentro.trim(),
                activo: activoCentro,
                direccion: direccionCentro.trim(),
                codigo_ccc: codigoCcc.trim(),
                zona_horaria: zonaHoraria.trim(),
                latitud: latitudCentro,
                longitud: longitudCentro,
              }
            : c,
        ),
      );

      mostrarMensaje("Éxito", "Centro de trabajo actualizado.");
      setCentroEnEdicion(null);
    } catch (error: any) {
      mostrarError(
        "Error al actualizar el centro de trabajo: " +
          obtenerMensajeAmigableError(error.message),
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN Y REACTIVACIÓN
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
          prev.map((c: CentroTrabajo) =>
            c.id === centroId ? { ...c, activo: false } : c,
          ),
        );
        mostrarMensaje("Éxito", "Centro de trabajo enviado a la papelera.");
      } catch (error: any) {
        mostrarMensaje(
          "Acción Bloqueada",
          `No se puede eliminar el centro porque tiene contratos de trabajadores activos asociados. Rescinda los contratos primero. ` +
            error,
        );
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

  const handleReactivarCentro = async (centroId: string) => {
    try {
      setGuardando(true);
      await cambiarEstadoCentroTrabajo(centroId, true);
      setCentrosEmpresa((prev) =>
        prev.map((centro) =>
          centro.id === centroId ? { ...centro, activo: true } : centro,
        ),
      );
      mostrarMensaje("Éxito", "Centro de trabajo reactivado correctamente.");
    } catch (error: any) {
      mostrarError(
        "Error al reactivar el centro de trabajo: " +
          obtenerMensajeAmigableError(error.message),
      );
    } finally {
      setGuardando(false);
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
          guardando && { opacity: 0.7 },
        ]}
        disabled={guardando}
        onPress={() => {
          if (!mostrarFormCentro) {
            setNombreCentro("");
            setDireccionCentro("");
            setZonaHoraria("Europe/Madrid");
            setCodigoCcc("");
            setLatitudCentro(0);
            setLongitudCentro(0);
          }
          setMostrarFormCentro(!mostrarFormCentro);
          setCentroEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormCentro ? "✕ Cancelar" : "＋ Añadir Centro de Trabajo"}
        </ThemedText>
      </Pressable>

      {/* ==========================================
          FORMULARIO DE CREACIÓN
         ========================================== */}
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
              editable={!guardando}
              returnKeyType="next"
              onSubmitEditing={() => crearDireccionRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Dirección del Centro
            </ThemedText>
            <TextInput
              ref={crearDireccionRef}
              style={styles.inputForm}
              value={direccionCentro}
              onChangeText={setDireccionCentro}
              placeholder="Ej. Calle Mayor 12"
              editable={!guardando}
              returnKeyType="next"
              onSubmitEditing={() => crearZonaRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <Row>
            <View style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}>
              <ThemedText style={styles.labelInput}>Zona Horaria *</ThemedText>
              <TextInput
                ref={crearZonaRef}
                style={styles.inputForm}
                value={zonaHoraria}
                onChangeText={setZonaHoraria}
                placeholder="Ej. Europe/Madrid"
                editable={!guardando}
                returnKeyType="next"
                onSubmitEditing={() => crearCccRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View style={[styles.campoFormulario, { flex: 1 }]}>
              <ThemedText style={styles.labelInput}>Código CCC</ThemedText>
              <TextInput
                ref={crearCccRef}
                style={styles.inputForm}
                value={codigoCcc}
                onChangeText={setCodigoCcc}
                keyboardType="numeric"
                placeholder="Código de cuenta"
                editable={!guardando}
                returnKeyType="go"
                onSubmitEditing={handleCrearCentro}
                blurOnSubmit={false}
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
            style={[
              styles.botonGuardar,
              { backgroundColor: "#EA580C" },
              guardando && { opacity: 0.7 },
            ]}
            onPress={handleCrearCentro}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.textoBotonGuardar}>
                Guardar Centro
              </ThemedText>
            )}
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>Centros Activos</ThemedText>

      {centrosActivos.map((centro: CentroTrabajo) => (
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
                style={[
                  {
                    backgroundColor: "#475569",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    marginRight: 8,
                  },
                  guardando && { opacity: 0.7 },
                ]}
                disabled={guardando}
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
                style={[
                  {
                    backgroundColor: "#fee2e2",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                  },
                  guardando && { opacity: 0.7 },
                ]}
                disabled={guardando}
                onPress={() => {
                  handleEliminarCentro(centro.id, centro.nombre);
                }}
              >
                <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
              </Pressable>
            </Row>
          </View>

          {/* ==========================================
              FORMULARIO DE EDICIÓN
             ========================================== */}
          {centroEnEdicion?.id === centro.id && (
            <View style={styles.contenedorFormDesplegado}>
              <ThemedText style={styles.formularioTitulo}>
                Editar Centro
              </ThemedText>

              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>
                  Nombre del Centro *
                </ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={nombreCentro}
                  onChangeText={setNombreCentro}
                  editable={!guardando}
                  returnKeyType="next"
                  onSubmitEditing={() => editarDireccionRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.campoFormulario}>
                <ThemedText style={styles.labelInput}>Dirección</ThemedText>
                <TextInput
                  ref={editarDireccionRef}
                  style={styles.inputForm}
                  value={direccionCentro}
                  onChangeText={setDireccionCentro}
                  editable={!guardando}
                  returnKeyType="next"
                  onSubmitEditing={() => editarZonaRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Row>
                <View
                  style={[styles.campoFormulario, { flex: 1, marginRight: 8 }]}
                >
                  <ThemedText style={styles.labelInput}>
                    Zona Horaria *
                  </ThemedText>
                  <TextInput
                    ref={editarZonaRef}
                    style={styles.inputForm}
                    value={zonaHoraria}
                    onChangeText={setZonaHoraria}
                    editable={!guardando}
                    returnKeyType="next"
                    onSubmitEditing={() => editarCccRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
                <View style={[styles.campoFormulario, { flex: 1 }]}>
                  <ThemedText style={styles.labelInput}>Código CCC</ThemedText>
                  <TextInput
                    ref={editarCccRef}
                    style={styles.inputForm}
                    value={codigoCcc}
                    onChangeText={setCodigoCcc}
                    keyboardType="numeric"
                    editable={!guardando}
                    returnKeyType="go"
                    onSubmitEditing={() => handleEditarCentro(centro)}
                    blurOnSubmit={false}
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
                  disabled={guardando}
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
                  guardando && { opacity: 0.7 },
                ]}
                onPress={() => {
                  handleEditarCentro(centro);
                }}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.textoBotonGuardار}>
                    Actualizar Cambios
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                onPress={() => setCentroEnEdicion(null)}
                style={[{ marginTop: 15 }, guardando && { opacity: 0.7 }]}
                disabled={guardando}
              >
                <ThemedText style={{ textAlign: "center", color: "#64748B" }}>
                  Cancelar edición
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {centrosInactivos.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Pressable
            style={[styles.botonAccionHeader, { backgroundColor: "#64748B" }]}
            onPress={() => setMostrarPapelera(!mostrarPapelera)}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              {mostrarPapelera
                ? "📂 Ocultar Papelera"
                : `🗑 Ver Papelera (${centrosInactivos.length})`}
            </ThemedText>
          </Pressable>
          {mostrarPapelera &&
            centrosInactivos.map((centro) => (
              <View key={centro.id} style={styles.itemListaEstructural}>
                <ThemedText style={styles.nombreElementoLista}>
                  {centro.nombre}
                </ThemedText>
                <Pressable
                  style={[styles.botonGuardar, { backgroundColor: "#16A34A" }]}
                  onPress={() => handleReactivarCentro(centro.id)}
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
