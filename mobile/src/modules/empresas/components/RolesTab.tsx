import { ThemedText } from "@/src/shared/components/themed-text";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Rol } from "../../roles/types/rol";
import {
  TIPO_USUARIO_LABELS,
  TipoUsuarioEnum,
} from "../../usuarios_roles/types/usuario_rol";

export default function TabRoles({
  rolesEmpresa,
  setRolesEmpresa,
  empresaSeleccionada,
  guardando,
  setGuardando,
  styles,
}: any) {
  // ESTADOS: Gestión de Roles
  const [mostrarFormRol, setMostrarFormRol] = useState(false);
  const [nombreRol, setNombreRol] = useState("");
  const [descripcionRol, setDescripcionRol] = useState("");
  const [esRolAdministrador, setEsRolAdministrador] = useState(false);
  const [rolEnEdicion, setRolEnEdicion] = useState<any | null>(null);
  const [tipoRolSeleccionado, setTipoRolSeleccionado] = useState("");

  // ==========================================
  // CREACIÓN DE ROLES
  // ==========================================
  const handleCrearRol = async () => {
    if (!nombreRol.trim() || !empresaSeleccionada?.id) {
      Alert.alert(
        "Campos incompletos",
        "Por favor introduce el nombre del rol.",
      );
      return;
    }
    try {
      setGuardando(true);
      // Reemplaza esto con tu llamada real al backend: crearRolEmpresa({...})
      const nuevoRol = {
        id: Date.now().toString(),
        nombre: nombreRol.trim(),
        descripcion: descripcionRol.trim(),
        es_admin: esRolAdministrador,
      };
      setRolesEmpresa((prev: Rol[]) => [...prev, nuevoRol]);
      setNombreRol("");
      setDescripcionRol("");
      setEsRolAdministrador(false);
      setMostrarFormRol(false);
      Alert.alert("Éxito", "Rol creado correctamente.");
    } catch (error: any) {
      Alert.alert("Error", "No se pudo crear el rol.");
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // EDICIÓN DE ROLES
  // ==========================================
  const handleEditarRol = async (rol: any) => {
    try {
      setGuardando(true);
      // Llamada real al backend para actualizar
      setRolesEmpresa((prev: Rol[]) =>
        prev.map((r: Rol) =>
          r.id === rol.id
            ? {
                ...r,
                nombre: nombreRol.trim(),
                descripcion: descripcionRol.trim(),
                es_admin: esRolAdministrador,
              }
            : r,
        ),
      );
      setRolEnEdicion(null);
      Alert.alert("Éxito", "Rol actualizado correctamente.");
    } catch (error: any) {
      Alert.alert("Error", "No se pudo actualizar el rol.");
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE ROLES
  // ==========================================
  const handleEliminarRol = async (rolId: string, nombreR: string) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        setRolesEmpresa((prev: Rol[]) =>
          prev.filter((r: Rol) => r.id !== rolId),
        );
        Alert.alert("Éxito", "Rol eliminado correctamente.");
      } catch (error: any) {
        Alert.alert("Error", "No se pudo eliminar el rol.");
      } finally {
        setGuardando(false);
      }
    };

    Alert.alert(
      "Confirmar eliminación",
      `¿Deseas eliminar el rol "${nombreR}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: ejecutarEliminacion,
        },
      ],
    );
  };

  return (
    <View>
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormRol ? "#64748B" : "#0284C7",
          },
        ]}
        onPress={() => {
          if (!mostrarFormRol) {
            setTipoRolSeleccionado("");
            setDescripcionRol("");
            setEsRolAdministrador(false);
          }
          setMostrarFormRol(!mostrarFormRol);
          setRolEnEdicion(null);
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormRol ? "✕ Cancelar" : "＋ Crear Nuevo Rol"}
        </ThemedText>
      </Pressable>

      {mostrarFormRol && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Registrar Rol del Sistema
          </ThemedText>

          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Tipo de Usuario (Enum) *
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginVertical: 6 }}
            >
              {Object.values(TipoUsuarioEnum).map((tipo) => {
                const info = TIPO_USUARIO_LABELS[tipo];
                const seleccionado = tipoRolSeleccionado === tipo;
                return (
                  <Pressable
                    key={tipo}
                    onPress={() => {
                      setTipoRolSeleccionado(tipo);
                      setDescripcionRol(info.descripcion);
                      setEsRolAdministrador(info.esAdmin);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: seleccionado ? "#0284C7" : "#CBD5E1",
                      backgroundColor: seleccionado ? "#E0F2FE" : "#F8FAFC",
                      marginRight: 8,
                    }}
                  >
                    <ThemedText
                      style={{
                        color: seleccionado ? "#0369A1" : "#334155",
                        fontWeight: "600",
                      }}
                    >
                      {info.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Descripción Personalizada
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={descripcionRol}
              onChangeText={setDescripcionRol}
              placeholder="Descripción de funciones..."
            />
          </View>

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
              ¿Es rol con privilegios de administración?
            </ThemedText>
            <Switch
              value={esRolAdministrador}
              onValueChange={setEsRolAdministrador}
              trackColor={{ false: "#767577", true: "#0284C7" }}
            />
          </View>

          <Pressable
            style={[styles.botonGuardar, { backgroundColor: "#0284C7" }]}
            onPress={handleCrearRol}
            disabled={guardando}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              Guardar Rol
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>
        Roles Configurados
      </ThemedText>

      {rolesEmpresa?.map((rol: Rol) => (
        <View key={rol.id}>
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
                {rol.nombre}
              </ThemedText>
              <ThemedText style={styles.subtextoElementoLista}>
                {rol.descripcion || "Sin descripción"} •{" "}
                {rol.nombre == TIPO_USUARIO_LABELS.Admin_empresa.toString() ||
                rol.nombre == TIPO_USUARIO_LABELS.Admin_gestoría.toString()
                  ? "Privilegios Admin 🛡️"
                  : "Rol Estándar 👤"}
              </ThemedText>
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
                  if (rolEnEdicion?.id === rol.id) {
                    setRolEnEdicion(null);
                  } else {
                    setRolEnEdicion(rol);
                    setTipoRolSeleccionado(rol.nombre);
                    setDescripcionRol(rol.descripcion || "");
                    setEsRolAdministrador(
                      (rol.nombre ==
                        TIPO_USUARIO_LABELS.Admin_empresa.toString() ||
                        rol.nombre ==
                          TIPO_USUARIO_LABELS.Admin_gestoría.toString()) ??
                        false,
                    );
                    handleEditarRol(rol);
                    setMostrarFormRol(false);
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
                onPress={() => handleEliminarRol(rol.id, rol.nombre)}
              >
                <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
