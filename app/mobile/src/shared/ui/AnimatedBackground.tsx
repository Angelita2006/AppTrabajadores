import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const AnimatedBackground = () => {
  // 1. Valor compartido para la animación
  const offset = useSharedValue(0);

  useEffect(() => {
    // 2. Bucle infinito de la animación
    offset.value = withRepeat(
      withTiming(1, {
        duration: 4000,
        easing: Easing.linear,
      }),
      -1, // -1 significa repetición infinita
      true, // true para hacer el efecto "ida y vuelta"
    );
  }, [offset]);

  // 3. Estilo dinámico basado en el valor compartido
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value * (width * 0.5) }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.gradientContainer, animatedStyles]}>
        <LinearGradient
          colors={["#4c669f", "#3b5998", "#192f6d", "#4c669f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    width: width * 2, // Hacemos el contenedor más ancho para que haya espacio para moverse
    height: height,
  },
  gradient: {
    flex: 1,
  },
});

export default AnimatedBackground;
