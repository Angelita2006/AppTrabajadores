import { ThemedText } from "@/src/shared/components/themed-text";
import React from "react";
import { Pressable, TextInput, View } from "react-native";

export default function TabFiscal({
  razonSocialInput,
  setRazonSocialInput,
  convenioInput,
  setConvenioInput,
  cnaeInput,
  setCnaeInput,
  direccionInput,
  setDireccionInput,
  handleGuardarDatosEmpresa,
  guardando,
  styles,
}: any) {
  return (
    <View>
      <ThemedText style={styles.formularioTitulo}>
        Información Fiscal
      </ThemedText>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Razón Social</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={razonSocialInput}
          onChangeText={setRazonSocialInput}
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Convenio Colectivo</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={convenioInput}
          onChangeText={setConvenioInput}
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Código CNAE</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={cnaeInput}
          onChangeText={setCnaeInput}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Dirección Social</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={direccionInput}
          onChangeText={setDireccionInput}
        />
      </View>

      <Pressable
        style={styles.botonGuardar}
        onPress={handleGuardarDatosEmpresa}
        disabled={guardando}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          Actualizar Información Fiscal
        </ThemedText>
      </Pressable>
    </View>
  );
}
