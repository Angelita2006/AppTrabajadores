import { Tabs } from "expo-router";
import { ProveedorTrabajador } from "../src/modules/trabajadores/store/TrabajadorContext";
import { IconSymbol } from "../src/shared/ui/icon-symbol";

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
          name="(protected)/trabajadores"
          options={{
            title: "Trabajadores",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="group" color={color} />
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
        <Tabs.Screen
          name="(protected)/horarios"
          options={{
            title: "Horarios",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="schedule" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(protected)/vacaciones"
          options={{
            title: "Vacaciones",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="event" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(protected)/incidencias"
          options={{
            title: "Incidencias",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="warning" color={color} />
            ),
          }}
        />
        <Tabs.Screen name="(protected)/fichajes" options={{ href: null }} />
        <Tabs.Screen name="(protected)/perfil" options={{ href: null }} />
        <Tabs.Screen name="(protected)/_layout" options={{ href: null }} />
        <Tabs.Screen name="(public)/login" options={{ href: null }} />
        <Tabs.Screen name="(public)/registro" options={{ href: null }} />
        <Tabs.Screen
          name="(public)/recuperar-password"
          options={{ href: null }}
        />
      </Tabs>
    </ProveedorTrabajador>
  );
}
