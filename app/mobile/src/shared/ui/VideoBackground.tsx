// app/mobile/src/shared/ui/VideoBackground.tsx
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

export default function VideoBackground() {
  const videoLocal = require("../../../assets/video/login-bg.mp4");

  const player = useVideoPlayer(videoLocal, (playerInstance) => {
    playerInstance.muted = true; // Mute obligatorio para saltar el bloqueo de autoplay en Web
    playerInstance.loop = true; // Bucle infinito continuo
    playerInstance.playbackRate = 1.0; // Velocidad normal
    playerInstance.play(); // Disparar reproducción automática
  });

  player.muted = true;

  // Controlamos el renderizado y aislamiento de forma condicional según la plataforma
  if (Platform.OS === "web") {
    return (
      <View
        style={StyleSheet.absoluteFill}
        {...({
          tabIndex: -1,
          inert: "true",
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

  // Vista nativa pura para Android (Pixel_9) e iOS
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
    backgroundColor: "rgba(15, 23, 42, 0.65)", // Filtro de legibilidad UX
  },
});
