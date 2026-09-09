import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function LottieBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LottieView
        source={require("../../../assets/animations/background-login.json")}
        autoPlay
        loop
        style={styles.animation}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  animation: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.70)",
  },
});
