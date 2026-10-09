import React, { useEffect, useRef } from "react";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

interface SignatureCaptureProps {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (signature: string) => void;
}

export function SignatureCapture({
  visible,
  title,
  onCancel,
  onConfirm,
}: SignatureCaptureProps) {
  const signatureRef = useRef<any>(null);
  const webCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const canvas = webCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#0F172A";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    const getPosition = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const point = "touches" in event ? event.touches[0] : event;
      return {
        x: (point.clientX - rect.left) * (canvas.width / rect.width),
        y: (point.clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const start = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      isDrawingRef.current = true;
      const point = getPosition(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
    };
    const move = (event: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      event.preventDefault();
      const point = getPosition(event);
      context.lineTo(point.x, point.y);
      context.stroke();
    };
    const stop = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("mouseleave", stop);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("mouseleave", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", stop);
    };
  }, [visible]);

  const confirmarFirma = () => {
    if (Platform.OS === "web") {
      const canvas = webCanvasRef.current;
      if (canvas) onConfirm(canvas.toDataURL("image/png"));
      return;
    }
    signatureRef.current?.readSignature();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.canvas}>
            {Platform.OS === "web" ? (
              <canvas
                ref={webCanvasRef}
                width={640}
                height={360}
                style={styles.webCanvas as React.CSSProperties}
              />
            ) : (
              <SignatureCanvas
                ref={signatureRef}
                onOK={onConfirm}
                descriptionText="Firme aquí"
                clearText="Limpiar"
                confirmText="Usar firma"
                webStyle=".m-signature-pad { box-shadow: none; border: 1px solid #CBD5E1; border-radius: 8px; }"
              />
            )}
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancel]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirm]}
              onPress={confirmarFirma}
            >
              <Text style={styles.confirmText}>Guardar firma</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#00000099",
  },
  dialog: {
    minHeight: 390,
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  title: {
    marginBottom: 12,
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },
  canvas: { height: 260, overflow: "hidden", borderRadius: 8 },
  webCanvas: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    touchAction: "none",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  button: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancel: { backgroundColor: "#E2E8F0" },
  confirm: { backgroundColor: "#2563EB" },
  cancelText: { color: "#334155", fontWeight: "700" },
  confirmText: { color: "#FFFFFF", fontWeight: "700" },
});
