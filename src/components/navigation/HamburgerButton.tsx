import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface HamburgerButtonProps {
  onPress: () => void;
}

export default function HamburgerButton({ onPress }: HamburgerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.line} />
      <View style={styles.line} />
      <View style={styles.line} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#1B2333",
    borderWidth: 1,
    borderColor: "#303A4F",
    justifyContent: "center",
    alignItems: "center",
    gap: 4.5,
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: "#242D40",
  },
  line: {
    width: 20,
    height: 2.2,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
});
