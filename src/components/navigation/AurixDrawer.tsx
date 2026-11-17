import { getShopCode } from "@/storage/localStorage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface AurixDrawerProps {
  visible?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  activeRoute?: "stock-taking" | "item-details" | "main";
}

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 300);

export default function AurixDrawer({
  visible,
  isOpen,
  onClose,
  activeRoute = "stock-taking",
}: AurixDrawerProps) {
  const isVisible = visible ?? isOpen ?? false;
  const [shopCode, setShopCode] = useState<string>("");
  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));

  useEffect(() => {
    if (isVisible) {
      void getShopCode().then((code) => setShopCode(code || ""));
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const handleNavigate = (target: "stock-taking" | "item-details") => {
    onClose();
    if (activeRoute !== target) {
      router.replace(`/(tabs)/${target}` as any);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Slide-out Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brandTitle}>AURIX</Text>
              {shopCode ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Branch: {shopCode}</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Menu Items */}
          <View style={styles.menuList}>
            {/* Stock Taking */}
            <Pressable
              onPress={() => handleNavigate("stock-taking")}
              style={({ pressed }) => [
                styles.menuItem,
                activeRoute === "stock-taking" && styles.menuItemActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.menuIcon}>📦</Text>
              <View style={styles.menuTextWrap}>
                <Text
                  style={[
                    styles.menuTitle,
                    activeRoute === "stock-taking" && styles.menuTitleActive,
                  ]}
                >
                  Stock Taking
                </Text>
                <Text style={styles.menuSubtitle}>Inventory count & scan</Text>
              </View>
              {activeRoute === "stock-taking" && (
                <View style={styles.activeDot} />
              )}
            </Pressable>

            {/* Item Details */}
            <Pressable
              onPress={() => handleNavigate("item-details")}
              style={({ pressed }) => [
                styles.menuItem,
                activeRoute === "item-details" && styles.menuItemActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.menuIcon}>🏷️</Text>
              <View style={styles.menuTextWrap}>
                <Text
                  style={[
                    styles.menuTitle,
                    activeRoute === "item-details" && styles.menuTitleActive,
                  ]}
                >
                  Item Details
                </Text>
                <Text style={styles.menuSubtitle}>
                  Sales estimates & lookup
                </Text>
              </View>
              {activeRoute === "item-details" && (
                <View style={styles.activeDot} />
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider} />
            <Text style={styles.versionText}>
              AURIX v1.0 • Blogtec Software LLP
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(6, 9, 20, 0.65)",
  },
  drawer: {
    height: "100%",
    backgroundColor: "#121826",
    borderRightWidth: 1,
    borderRightColor: "#303A4F",
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#D4AF37",
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderColor: "#D4AF37",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4AF37",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1B2333",
    borderWidth: 1,
    borderColor: "#303A4F",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 16,
    color: "#AAB3C5",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#303A4F",
    marginVertical: 12,
  },
  menuList: {
    flex: 1,
    paddingTop: 8,
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1B2333",
    borderWidth: 1,
    borderColor: "#242D40",
  },
  menuItemActive: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    borderColor: "#D4AF37",
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  menuTitleActive: {
    color: "#D4AF37",
  },
  menuSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#8A93A6",
    marginTop: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
  },
  footer: {
    paddingTop: 8,
  },
  versionText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
