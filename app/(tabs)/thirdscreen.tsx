import { Platform, StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Collapsible } from "@/components/ui/collapsible";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Perfil
        </ThemedText>
      </ThemedView>
      <ThemedText>
        This app includes example code to help you get started.
      </ThemedText>
      <Collapsible title="File-based routing">
        <ThemedText>
          This app has three screens:{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText>{" "}
          and{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
          <ThemedText type="defaultSemiBold">
            app/(tabs)/thirdscreen.tsx
          </ThemedText>
        </ThemedText>
      </Collapsible>
      <ThemedText>
        The layout file in{" "}
        <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{" "}
        sets up the tab navigator.
      </ThemedText>
      <Collapsible title="What's the third screen about?">
        <ThemedText>
          This template has light and dark mode support. The{" "}
          <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> hook
          lets you inspect what the user&apos;s current color scheme is, and so
          you can adjust UI colors accordingly.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Animations">
        <ThemedText>
          This template includes an example of an animated component. The{" "}
          <ThemedText type="defaultSemiBold">
            components/HelloWave.tsx
          </ThemedText>{" "}
          component uses the powerful{" "}
          <ThemedText type="defaultSemiBold" style={{ fontFamily: Fonts.mono }}>
            react-native-reanimated
          </ThemedText>{" "}
          library to create a waving hand animation.
        </ThemedText>
        {Platform.select({
          web: (
            <ThemedText>
              The{" "}
              <ThemedText type="default">
                components/ParallaxScrollView.tsx
              </ThemedText>{" "}
              component provides a parallax effect for the header image.
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
