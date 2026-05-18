import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTrabajador } from "../context/TrabajadorContext";
import { obtenerTrabajadorPorUsuarioId } from "../models/trabajadores";
import { useAuthStore } from "../store/authStore";

export default function IndexRedirect() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const { setTrabajadorActual } = useTrabajador();

  useEffect(() => {
    if (loading) return;

    if (user) {
      const trabajador = obtenerTrabajadorPorUsuarioId(user.id);
      setTrabajadorActual(trabajador);
      router.replace("/(protected)/index" as unknown as any);
    } else {
      router.replace("/(public)/login" as unknown as any);
    }
  }, [loading, user, router, setTrabajadorActual]);

  return null;
}
