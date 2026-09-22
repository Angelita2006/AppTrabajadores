import api from "@/src/service/api/api";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image } from "react-native";

export const ImagenConToken = ({
  rutaRelativa,
  style,
}: {
  rutaRelativa: string;
  style: any;
}) => {
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { mostrarError } = useAppModal();

  // 1. Si es una ruta local del dispositivo
  const esRutaLocal =
    rutaRelativa?.startsWith("file://") ||
    rutaRelativa?.startsWith("content://") ||
    rutaRelativa?.startsWith("blob:");

  useEffect(() => {
    if (esRutaLocal) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchProtectedImage = async () => {
      try {
        if (!rutaRelativa) return;

        let endpoint = rutaRelativa;
        if (endpoint.startsWith("/static/")) {
          endpoint = endpoint.replace("/static/", "/api/archivos/");
        } else if (!endpoint.startsWith("/api/archivos/")) {
          endpoint = `/api/archivos${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
        }

        const response = await api.get(endpoint, { responseType: "blob" });

        const reader = new FileReader();
        reader.readAsDataURL(response.data);
        reader.onloadend = () => {
          if (isMounted) {
            setImgUri(reader.result as string);
            setLoading(false);
          }
        };
      } catch (error: any) {
        mostrarError("Error al cargar imagen protegida con token: " + error);
        if (isMounted) setLoading(false);
      }
    };

    fetchProtectedImage();
    return () => {
      isMounted = false;
    };
  }, [rutaRelativa, esRutaLocal]);

  if (loading && !esRutaLocal) return <ActivityIndicator style={style} />;

  // 2. Si es local, devolvemos la imagen nativa directamente
  if (esRutaLocal) {
    return (
      <Image source={{ uri: rutaRelativa }} style={style} resizeMode="cover" />
    );
  }

  if (!imgUri) return null;

  return <Image source={{ uri: imgUri }} style={style} resizeMode="cover" />;
};
