// import { useAuthStore } from "@/src/modules/usuarios/store/useAuthStore";
// import { useUsuarioQuery } from "@/src/modules/usuarios/store/useUsuarioQuery";
// import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
// import { Tabs } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { ThemedText } from "../../src/shared/components/ThemedText";
// import { IconSymbol } from "../../src/shared/ui/IconSymbol";

// export default function TabsLayout() {
//   const { token } = useAuthStore();
//   const { usuarioActual } = useUsuarioQuery();
//   const insets = useSafeAreaInsets();

//   const tieneSesion = token !== null && usuarioActual !== null;

//   // Clasificación de roles basada en los datos frescos del servidor
//   const esAdmin =
//     usuarioActual?.tipo_usuario === "Admin_empresa" ||
//     usuarioActual?.tipo_usuario === "Admin_gestoría";

//   const esRrhh = usuarioActual?.tipo_usuario === "Rrhh";
//   const esTrabajador = usuarioActual?.tipo_usuario === "Trabajador";

//   const esInspectorOVisualizador =
//     usuarioActual?.tipo_usuario === "Auditor_itss" ||
//     usuarioActual?.tipo_usuario === "Representante_legal";

//   const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
//   const tabBarHeight = 65 + bottomInset;

//   return (
//     <AppModalProvider>
//       <Tabs
//         screenOptions={{
//           tabBarStyle: {
//             display: tieneSesion ? "flex" : "none",
//             height: tabBarHeight,
//             paddingTop: 8,
//             paddingBottom: bottomInset,
//             backgroundColor: "#FFFFFF",
//             borderTopWidth: 1,
//             borderTopColor: "#E2E8F0",
//           },
//           tabBarLabel: ({ children, color }) => (
//             <ThemedText
//               numberOfLines={1}
//               style={{
//                 fontSize: 9,
//                 textAlign: "center",
//                 color,
//                 marginTop: 2,
//                 fontWeight: "700",
//               }}
//             >
//               {children}
//             </ThemedText>
//           ),
//           tabBarActiveTintColor: "#2563EB",
//           tabBarInactiveTintColor: "#64748B",
//           headerShown: false,
//         }}
//       >
//         <Tabs.Screen
//           name="home"
//           options={{
//             title: "Fichar",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="house.fill" color={color} />
//             ),
//             href: tieneSesion && (esTrabajador || esRrhh) ? "/home" : null,
//           }}
//         />
//         <Tabs.Screen
//           name="perfil"
//           options={{
//             title: tieneSesion ? "Perfil" : "Login",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="person" color={color} />
//             ),
//             href: !tieneSesion ? null : "/perfil",
//           }}
//         />
//         <Tabs.Screen
//           name="empresa"
//           options={{
//             title: "Empresa",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="briefcase.fill" color={color} />
//             ),
//             href: tieneSesion && (esAdmin || esRrhh) ? "/empresa" : null,
//           }}
//         />
//         <Tabs.Screen
//           name="plantilla"
//           options={{
//             title: "Plantilla",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="group" color={color} />
//             ),
//             href: tieneSesion && (esAdmin || esRrhh) ? "/plantilla" : null,
//           }}
//         />
//         <Tabs.Screen
//           name="horarios"
//           options={{
//             title: "Horarios",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="schedule" color={color} />
//             ),
//             href: tieneSesion && (esTrabajador || esRrhh) ? "/horarios" : null,
//           }}
//         />
//         <Tabs.Screen
//           name="fichajes"
//           options={{
//             title: "Registro",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="folder" color={color} />
//             ),
//             href:
//               tieneSesion && (esAdmin || esRrhh || esInspectorOVisualizador)
//                 ? "/fichajes"
//                 : null,
//           }}
//         />
//         <Tabs.Screen
//           name="incidencias"
//           options={{
//             title: "Incidencias",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="warning" color={color} />
//             ),
//             href: tieneSesion && esTrabajador ? "/incidencias" : null,
//           }}
//         />
//         <Tabs.Screen
//           name="gestion-incidencias"
//           options={{
//             title: "Incidencias",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="warning" color={color} />
//             ),
//             href:
//               tieneSesion && (esAdmin || esRrhh)
//                 ? "/gestion-incidencias"
//                 : null,
//           }}
//         />
//         <Tabs.Screen
//           name="ausencias"
//           options={{
//             title: "Ausencias",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="event" color={color} />
//             ),
//             href: tieneSesion && esTrabajador ? "/ausencias" : null,
//           }}
//         />
//         <Tabs.Screen
//           name="gestion-ausencias"
//           options={{
//             title: "Ausencias",
//             tabBarIcon: ({ color }) => (
//               <IconSymbol size={24} name="event" color={color} />
//             ),
//             href:
//               tieneSesion && (esAdmin || esRrhh) ? "/gestion-ausencias" : null,
//           }}
//         />
//       </Tabs>
//     </AppModalProvider>
//   );
// }

import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { IconSymbol } from "../../src/shared/ui/IconSymbol";

export default function TabsLayout() {
  const { usuarioActual } = useSesion();
  const insets = useSafeAreaInsets();

  const tieneSesion = usuarioActual !== null;

  // Clasificación de roles
  const esAdmin =
    usuarioActual?.tipo_usuario === "Admin_empresa" ||
    usuarioActual?.tipo_usuario === "Admin_gestoría";

  const esRrhh = usuarioActual?.tipo_usuario === "Rrhh";
  const esTrabajador = usuarioActual?.tipo_usuario === "Trabajador";

  const esInspectorOVisualizador =
    usuarioActual?.tipo_usuario === "Auditor_itss" ||
    usuarioActual?.tipo_usuario === "Representante_legal";

  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
  const tabBarHeight = 65 + bottomInset;

  return (
    <AppModalProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            display: tieneSesion ? "flex" : "none",
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: bottomInset,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
          },
          tabBarLabel: ({ children, color }) => (
            <ThemedText
              numberOfLines={1}
              style={{
                fontSize: 9,
                textAlign: "center",
                color,
                marginTop: 2,
                fontWeight: "700",
              }}
            >
              {children}
            </ThemedText>
          ),
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#64748B",
          headerShown: false,
        }}
      >
        {/* 1. Fichar / Home personal (Trabajadores y RRHH) */}
        <Tabs.Screen
          name="home"
          options={{
            title: "Fichar",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="house.fill" color={color} />
            ),
            href: tieneSesion && (esTrabajador || esRrhh) ? "/home" : null,
          }}
        />

        {/* 2. Perfil / Login (Siempre visible con sesión) */}
        <Tabs.Screen
          name="perfil"
          options={{
            title: tieneSesion ? "Perfil" : "Login",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="person" color={color} />
            ),
            href: !tieneSesion ? null : "/perfil",
          }}
        />

        {/* 3. Empresa (Admin y RRHH) */}
        <Tabs.Screen
          name="empresa"
          options={{
            title: "Empresa",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="briefcase.fill" color={color} />
            ),
            href: tieneSesion && (esAdmin || esRrhh) ? "/empresa" : null,
          }}
        />

        {/* 4. Plantilla (Admin y RRHH) */}
        <Tabs.Screen
          name="plantilla"
          options={{
            title: "Plantilla",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="group" color={color} />
            ),
            href: tieneSesion && (esAdmin || esRrhh) ? "/plantilla" : null,
          }}
        />

        {/* 5. Horarios personales (Trabajadores y RRHH) */}
        <Tabs.Screen
          name="horarios"
          options={{
            title: "Horarios",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="schedule" color={color} />
            ),
            href: tieneSesion && (esTrabajador || esRrhh) ? "/horarios" : null,
          }}
        />

        {/* 6. Registro de fichajes globales (Admin, RRHH e Inspectores/Representantes) */}
        <Tabs.Screen
          name="fichajes"
          options={{
            title: "Registro",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="folder" color={color} />
            ),
            href:
              tieneSesion && (esAdmin || esRrhh || esInspectorOVisualizador)
                ? "/fichajes"
                : null,
          }}
        />

        {/* 7. Incidencias personales (Trabajadores) */}
        <Tabs.Screen
          name="incidencias"
          options={{
            title: "Incidencias",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="warning" color={color} />
            ),
            href: tieneSesion && esTrabajador ? "/incidencias" : null,
          }}
        />

        {/* 9. Gestión completa de Incidencias (Admin y RRHH) */}
        <Tabs.Screen
          name="gestion-incidencias"
          options={{
            title: "Incidencias",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="warning" color={color} />
            ),
            href:
              tieneSesion && (esAdmin || esRrhh)
                ? "/gestion-incidencias"
                : null,
          }}
        />

        {/* 10. Ausencias personales (Trabajadores) */}
        <Tabs.Screen
          name="ausencias"
          options={{
            title: "Ausencias",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="event" color={color} />
            ),
            href: tieneSesion && esTrabajador ? "/ausencias" : null,
          }}
        />

        {/* 12. Gestión completa de Ausencias (Admin y RRHH) */}
        <Tabs.Screen
          name="gestion-ausencias"
          options={{
            title: "Ausencias",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="event" color={color} />
            ),
            href:
              tieneSesion && (esAdmin || esRrhh) ? "/gestion-ausencias" : null,
          }}
        />
      </Tabs>
    </AppModalProvider>
  );
}
