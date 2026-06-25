// app/mobile/src/shared/ui/VideoBackground.tsx
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

export default function VideoBackground() {
  const videoLocal = require("../../../assets/video/login-bg.mp4");

  const player = useVideoPlayer(videoLocal, (playerInstance) => {
    playerInstance.muted = true;
    playerInstance.playbackRate = 1.0;
    playerInstance.loop = Platform.OS === "web";
    playerInstance.play();
  });

  player.muted = true;

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Escuchador que vigila los fotogramas del MP4 en tiempo real
    const subscripcionTime = player.addListener("timeUpdate", () => {
      const tiempoActual = player.currentTime;
      const duracionTotal = player.duration;

      // Al llegar al final (con 0.1s de margen), invertimos la velocidad a marcha atrás (-1.0)
      if (
        duracionTotal > 0 &&
        tiempoActual >= duracionTotal - 0.1 &&
        player.playbackRate > 0
      ) {
        player.playbackRate = -1.0;
      }

      // Al regresar al fotograma de inicio (0.1s), restablecemos la velocidad hacia adelante (1.0)
      if (tiempoActual <= 0.1 && player.playbackRate < 0) {
        player.playbackRate = 1.0;
        player.play(); // Asegura el rearranque inmediato
      }
    });

    // Limpieza de memoria al desmontar la pantalla de Login
    return () => {
      subscripcionTime.remove();
    };
  }, [player]);

  // Controlamos el renderizado y aislamiento de forma condicional según la plataforma
  if (Platform.OS === "web") {
    return (
      <View
        style={StyleSheet.absoluteFill}
        {...({
          tabIndex: -1,
          // inert: "true",
          dataSet: { inert: "" },
        } as any)}
      >
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="cover"
          showsTimecodes={false}
        />
        <View style={styles.overlay} />
      </View>
    );
  }

  // Vista nativa pura para Android e iOS
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessible={false}
      importantForAccessibility="no"
    >
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        showsTimecodes={false}
      />
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
});
