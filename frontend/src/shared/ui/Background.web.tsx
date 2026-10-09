import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

export default function VideoBackground() {
  const videoLocal = require("../../../assets/video/login-bg.mp4");

  // Instancia del reproductor con los parámetros iniciales
  const player = useVideoPlayer(videoLocal, (playerInstance) => {
    playerInstance.muted = true;
    playerInstance.playbackRate = 1.0;
    playerInstance.loop = true;
    playerInstance.play();
  });

  useEffect(() => {
    player.muted = true;
    player.play();
  }, [player]);

  // Vista nativa pura para Web
  return (
    <View
      style={StyleSheet.absoluteFill}
      {...({
        tabIndex: -1,
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

const styles = StyleSheet.create({
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
});
