import { useSesion } from "@/src/modules/usuarios/store/SesionContextZustand";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function TabsIndex() {
  const { cargandoSesionLocal } = useSesion();

  if (cargandoSesionLocal) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <Redirect href="/(tabs)/perfil" />;
}
