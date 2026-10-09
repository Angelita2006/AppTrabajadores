import LottieBackground from "@/src/shared/ui/Background.native";
import VideoBackground from "@/src/shared/ui/Background.web";
import { Platform } from "react-native";

export default function RegistroGestoriaScreen() {
  if (Platform.OS === "web") return <VideoBackground />;
  return <LottieBackground />;
}
