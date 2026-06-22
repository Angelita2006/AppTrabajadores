import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function VideoBackground() {
  // Ruta local de tu archivo MP4 ligero
  const videoLocal = require("../../../assets/video/login-bg.mp4");

  /**
   * CONTROL DEL REPRODUCTOR NATIVO:
   * useVideoPlayer inicializa el video de forma óptima en el sistema operativo.
   * Configuramos las mismas propiedades que tenías en expo-av.
   */
  const player = useVideoPlayer(videoLocal, (playerInstance) => {
    playerInstance.loop = true; // isLooping={true} -> Bucle infinito sin saltos
    playerInstance.muted = true; // isMuted={true} -> Silenciado por completo
    playerInstance.playbackRate = 1.0; // rate={1.0} -> Velocidad normal
    playerInstance.play(); // shouldPlay={true} -> Reproducción automática
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* 1. COMPONENTE REPRODUCTOR DE VIDEO OPTIMIZADO (NUEVO) */}
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false} // Oculta los botones nativos de reproducción (play/pausa)
        contentFit="cover" // resizeMode={ResizeMode.COVER} -> Cubre la pantalla sin cortes
        showsTimecodes={false} // Oculta marcas de tiempo del sistema
      />

      {/* 2. CAPA SUPERIOR OSCURA (OVERLAY) */}
      {/* Mantiene el contraste correcto y la legibilidad de las letras del formulario */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: width,
    height: height,
    position: "absolute",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
});
