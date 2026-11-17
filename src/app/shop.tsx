import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDeviceInfo } from "@/services/deviceInfo";
import { registerDevice } from "@/services/stockTakingApi";

import {
  checkApiConnection,
  normalizeBaseUrl,
  setApiBaseUrl,
} from "@/services/apiClient";
import { getBranchBaseUrl } from "@/services/branchApi";

import {
  saveBaseUrl,
  saveDeviceId,
  savePassword,
  saveShopCode,
  saveUsername,
} from "@/storage/localStorage";

export default function ShopScreen() {
  const params = useLocalSearchParams<{
    companyId: string;
    branchCodes: string;
  }>();

  const companyId = params.companyId;

  const branchCodes =
    typeof params.branchCodes === "string" && params.branchCodes
      ? params.branchCodes.split(",")
      : [];

  console.log("SHOP: companyId:", companyId);
  console.log("SHOP: branchCodes:", branchCodes);

  const [selectedShop, setSelectedShop] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedShop) {
      Alert.alert("Required", "Please select a shop.");
      return;
    }

    try {
      setLoading(true);

      console.log("SHOP: selected shop:", selectedShop);

      const result = await getBranchBaseUrl(companyId, selectedShop);

      const resolvedShopCode = result.branchCode?.trim() || selectedShop.trim();

      console.log("SHOP: base URL received:", result.baseUrl);
      console.log("SHOP: resolved shop code:", resolvedShopCode);

      const cleanUrl = normalizeBaseUrl(result.baseUrl);
      console.log("SHOP: normalized URL:", cleanUrl);
      const isReachable = await checkApiConnection(cleanUrl);

      console.log("SHOP: API reachable:", isReachable);

      if (!isReachable) {
        Alert.alert("Connection Error", "The selected shop is not reachable.");
        return;
      }

      setApiBaseUrl(cleanUrl);

      const deviceInfo = await getDeviceInfo();

      const registeredDevice = await registerDevice({
        deviceName: deviceInfo.deviceName ?? "Unknown",
        deviceModel: deviceInfo.deviceModel ?? "Unknown",
        osVersion: deviceInfo.osVersion ?? "Unknown",
      });

      await saveDeviceId(registeredDevice.deviceId);

      await saveBaseUrl(cleanUrl);
      await saveShopCode(resolvedShopCode);
      await saveUsername(result.username);
      await savePassword(result.password);

      console.log("SHOP: session saved");

      router.replace("/(tabs)/stock-taking");
    } catch (error) {
      console.error("SHOP: base URL lookup failed:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to the selected shop. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.formContainer}>
          <View style={styles.card}>
            <Text style={styles.brand}>AURIX</Text>

            <Text style={styles.title}>SELECT SHOP</Text>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Shop Code</Text>

              <View style={styles.pickerContainer}>
                <Picker
                  mode="dropdown"
                  selectedValue={selectedShop}
                  onValueChange={(value) => {
                    setSelectedShop(value);
                  }}
                  style={styles.picker}
                  dropdownIconColor="#D4AF37"
                >
                  <Picker.Item label="Select Shop" value="" color="#8A93A6" />

                  {branchCodes.map((branchCode) => (
                    <Picker.Item
                      key={branchCode}
                      label={branchCode}
                      value={branchCode}
                      color="#000000"
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#060914" />
              ) : (
                <Text style={styles.continueText}>Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121826",
  },

  container: {
    flex: 1,
  },

  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },

  card: {
    borderRadius: 18,
    padding: 26,
    backgroundColor: "#1B2333",
    borderWidth: 1,
    borderColor: "#303A4F",
    elevation: 6,
  },

  brand: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 4,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: 0.5,
  },

  fieldContainer: {
    marginBottom: 24,
  },

  label: {
    color: "#AAB3C5",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  pickerContainer: {
    height: 54,
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    backgroundColor: "#242D40",
    justifyContent: "center",
    overflow: "hidden",
  },

  picker: {
    height: 54,
    color: "#FFFFFF",
  },

  continueButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  continueText: {
    color: "#060914",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
