import { Pressable, StyleSheet, View } from "react-native";
import { Colors, AppColorScheme } from "@/src/constants/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useTemaStore } from "../store/temaStore";
import { ThemedText } from "@/src/shared/components/ThemedText";

const OPCIONES: { value: AppColorScheme; title: string }[] = [
  { value: "light", title: "Claro" },
  { value: "dark", title: "Oscuro" },
];

export function SelectorTema() {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const establecerTema = useTemaStore((state) => state.establecerTema);

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Apariencia
      </ThemedText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {OPCIONES.map((option) => {
          const selected = theme === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => void establecerTema(option.value)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                type="defaultSemiBold"
                style={{ color: selected ? colors.onPrimary : colors.text }}
              >
                {option.title}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  title: {
    fontSize: 12,
  },
  options: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
