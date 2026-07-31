import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="registro" />
      <Stack.Screen name="registro-organizacion" />
      <Stack.Screen name="recuperar-password" />
    </Stack>
  );
}
