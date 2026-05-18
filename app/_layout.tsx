import { Tabs } from "expo-router";
import { IconSymbol } from "../components/ui/icon-symbol";
import { ProveedorTrabajador } from "../context/TrabajadorContext";
// import { useColorScheme } from "../hooks/use-color-scheme";

export default function TabLayout() {
  return (
    <ProveedorTrabajador>
      <Tabs>
        <Tabs.Screen
          name="(protected)/index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(public)/login"
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
              <IconSymbol
                size={28}
                name="house.and.flag.circle"
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </ProveedorTrabajador>
  );
}
