import { ThemedText } from "@/src/shared/components/ThemedText";
import { Row } from "@/src/shared/ui/AppSurface";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { CentroTrabajo } from "../../../centros-trabajo/types/centro-trabajo";
import {
  crearDepartamento,
  editarDepartamento,
  eliminarDepartamento,
} from "../../../departamentos/api/services";
import { Departamento } from "../../../departamentos/types/departamento";
import { Empresa } from "../../types/empresa";

/**
 * Propiedades requeridas por el componente TabDepartamentos.
 */
interface TabDepartamentosProps {
  /** Listado de departamentos asociados a la empresa. */
  departamentosEmpresa: Departamento[];
  /** Función para actualizar el estado del listado de departamentos. */
  setDepartamentosEmpresa: React.Dispatch<React.SetStateAction<Departamento[]>>;
  /** Listado de centros de trabajo de la empresa. */
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
 * Componente que gestiona la pestaña de departamentos de una empresa,
 * permitiendo crear, listar, editar y eliminar departamentos vinculados a centros de trabajo.
 *
 * @component
 * @param {TabDepartamentosProps} props - Propiedades del componente.
 */
export default function TabDepartamentos({
  departamentosEmpresa,
  setDepartamentosEmpresa,
  centrosEmpresa,
  empresaActual,
  guardando,
  setGuardando,
  styles,
}: TabDepartamentosProps) {
  const [mostrarFormDepartamento, setMostrarFormDepartamento] = useState(false);
  const [nombreDepto, setNombreDepto] = useState("");
  const [departamentoEnEdicion, setDepartamentoEnEdicion] =
    useState<Departamento | null>(null);
  const [centroTrabajoId, setCentroTrabajoId] = useState("");

  // ==========================================
  // CREACIÓN DE DEPARTAMENTOS
  // ==========================================
  const handleCrearDepartamento = async () => {
    if (!nombreDepto.trim() || !empresaActual?.id) {
      mostrarMensaje(
        "Campos incompletos",
        "Por favor, introduce el nombre del departamento.",
      );
      return;
    }

    try {
      setGuardando(true);
      const nuevoDepto = await crearDepartamento({
        empresa_id: empresaActual.id,
        nombre: nombreDepto.trim(),
        centro_trabajo_id: centroTrabajoId || "",
      });

      setDepartamentosEmpresa([...departamentosEmpresa, nuevoDepto]);
      setNombreDepto("");
      setCentroTrabajoId("");
      setMostrarFormDepartamento(false);
      mostrarMensaje("Éxito", "Departamento creado correctamente.");
    } catch (error: any) {
      mostrarError("Error al crear el departamento: " + error);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // EDICIÓN DE DEPARTAMENTOS
  // ==========================================
  const handleEditarDepartamento = async () => {
    if (!departamentoEnEdicion) return;

    if (!nombreDepto.trim()) {
      mostrarMensaje(
        "Campos incompletos",
        "Por favor, introduce el nombre del departamento.",
      );
      return;
    }

    try {
      setGuardando(true);
      const payload = {
        nombre: nombreDepto.trim(),
        centro_trabajo_id: centroTrabajoId || "",
      };

      await editarDepartamento(departamentoEnEdicion.id, payload);

      setDepartamentosEmpresa((prev: Departamento[]) =>
        prev.map((d: Departamento) =>
          d.id === departamentoEnEdicion.id ? { ...d, ...payload } : d,
        ),
      );

      mostrarMensaje("Éxito", "Departamento actualizado correctamente.");
      setMostrarFormDepartamento(false);
      setDepartamentoEnEdicion(null);
      setNombreDepto("");
      setCentroTrabajoId("");
    } catch (error: any) {
      mostrarError("Error al actualizar el departamento: " + error);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE DEPARTAMENTOS
  // ==========================================
  const handleEliminarDepartamento = async (
    departamentoId: string,
    nombreDepto: string = "este departamento",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarDepartamento(departamentoId);
        setDepartamentosEmpresa((prev: Departamento[]) =>
          prev.filter((d: Departamento) => d.id !== departamentoId),
        );
        mostrarMensaje("Éxito", "Departamento eliminado correctamente.");
      } catch (error: any) {
        mostrarError("Error al eliminar el departamento: " + error);
      }
    };

    if (Platform.OS === "web") {
      const confirmado = window.confirm(
        `¿Deseas eliminar el departamento "${nombreDepto}"?`,
      );
      if (confirmado) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar eliminación",
        `¿Deseas eliminar el departamento "${nombreDepto}"?`,
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
            backgroundColor: mostrarFormDepartamento ? "#64748B" : "#7C3AED",
          },
          guardando && { opacity: 0.7 },
        ]}
        disabled={guardando}
        onPress={() => {
          if (!mostrarFormDepartamento) {
            setNombreDepto("");
            setCentroTrabajoId("");
          }
          setMostrarFormDepartamento(!mostrarFormDepartamento);
          setDepartamentoEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormDepartamento ? "✕ Cancelar" : "＋ Añadir Departamento"}
        </ThemedText>
      </Pressable>

      {mostrarFormDepartamento && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Nuevo Departamento
          </ThemedText>
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Nombre del Departamento *
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={nombreDepto}
              onChangeText={setNombreDepto}
              placeholder="Ej. Recursos Humanos"
              editable={!guardando}
            />
          </View>
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>Centro de Trabajo</ThemedText>
            <Picker
              selectedValue={centroTrabajoId}
              onValueChange={setCentroTrabajoId}
              enabled={!guardando}
            >
              <Picker.Item label="Seleccionar centro..." value="" />
              {centrosEmpresa.map((ct: CentroTrabajo) => (
                <Picker.Item key={ct.id} label={ct.nombre} value={ct.id} />
              ))}
            </Picker>
          </View>
          <Pressable
            style={[
              styles.botonGuardar,
              { backgroundColor: "#7C3AED" },
              guardando && { opacity: 0.7 },
            ]}
            onPress={handleCrearDepartamento}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.textoBotonGuardar}>
                Guardar Departamento
              </ThemedText>
            )}
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>
        Departamentos Activos
      </ThemedText>

      {departamentosEmpresa.map((dept: Departamento) => {
        const centro: CentroTrabajo | undefined = centrosEmpresa.find(
          (c: CentroTrabajo) => c.id === dept.centro_trabajo_id,
        );

        return (
          <View key={dept.id}>
            <View
              style={[
                styles.itemListaEstructural,
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                },
              ]}
            >
              <View>
                <ThemedText style={styles.nombreElementoLista}>
                  {dept.nombre}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: "#64748B" }}>
                  {centro ? `📍 ${centro.nombre}` : "Sin centro asignado"}
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
                    if (departamentoEnEdicion?.id === dept.id) {
                      setDepartamentoEnEdicion(null);
                    } else {
                      setDepartamentoEnEdicion(dept);
                      setNombreDepto(dept.nombre);
                      setCentroTrabajoId(dept.centro_trabajo_id || "");
                      setMostrarFormDepartamento(false);
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
                  onPress={() =>
                    handleEliminarDepartamento(dept.id, dept.nombre)
                  }
                >
                  <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
                </Pressable>
              </Row>
            </View>

            {/* Formulario de EDICIÓN */}
            {departamentoEnEdicion?.id === dept.id && (
              <View style={styles.contenedorFormDesplegado}>
                <ThemedText style={styles.formularioTitulo}>
                  Editar: {dept.nombre}
                </ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={nombreDepto}
                  onChangeText={setNombreDepto}
                  editable={!guardando}
                />
                <Picker
                  selectedValue={centroTrabajoId}
                  onValueChange={setCentroTrabajoId}
                  enabled={!guardando}
                >
                  <Picker.Item label="Seleccionar centro..." value="" />
                  {centrosEmpresa.map((ct: CentroTrabajo) => (
                    <Picker.Item key={ct.id} label={ct.nombre} value={ct.id} />
                  ))}
                </Picker>
                <Pressable
                  style={[
                    styles.botonGuardar,
                    { backgroundColor: "#7C3AED", marginTop: 10 },
                    guardando && { opacity: 0.7 },
                  ]}
                  disabled={guardando}
                  onPress={() => {
                    handleEditarDepartamento();
                  }}
                >
                  {guardando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.textoBotonGuardar}>
                      Actualizar Cambios
                    </ThemedText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setDepartamentoEnEdicion(null)}
                  style={[{ marginTop: 10 }, guardando && { opacity: 0.7 }]}
                  disabled={guardando}
                >
                  <ThemedText
                    style={{
                      textAlign: "center",
                      color: "#525153",
                    }}
                  >
                    Cancelar
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
