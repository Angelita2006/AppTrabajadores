import { Tabs } from "expo-router";
import { IconSymbol } from "../components/ui/icon-symbol";
import { ProveedorTrabajador } from "../context/TrabajadorContext";

export default function TabLayout() {
  return (
    <ProveedorTrabajador>
      <Tabs>
        <Tabs.Screen
          name="(protected)/home"
          options={{
            title: "Registro Horario",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(protected)/empresas"
          options={{
            title: "Empresas",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="briefcase.fill" color={color} />
            ),
          }}
        />
      </Tabs>
    </ProveedorTrabajador>
  );
}
