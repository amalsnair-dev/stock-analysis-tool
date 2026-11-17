import AurixDrawer from "@/components/navigation/AurixDrawer";
import HamburgerButton from "@/components/navigation/HamburgerButton";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setApiBaseUrl } from "@/services/apiClient";
import { getAllCounters, type Counter } from "@/services/counterApi";
import { getDatabaseToday, getItemsByCounter } from "@/services/itemApi";
import { getAllOperators, type Operator } from "@/services/operatorApi";
import {
  deleteStockTaking,
  getNextStockSerial,
  getStockTakingRecordsForDate,
  insertStockTaking,
  registerDevice,
} from "@/services/stockTakingApi";
import { getBaseUrl, getShopCode } from "@/storage/localStorage";

import UniversalTableModal from "@/components/UniversalTableModal/UniversalTableModal";
import { ValidationPopup } from "@/components/ValidationPopup/ValidationPopup";

import { getDeviceInfo } from "@/services/deviceInfo";

type Item = { desc: string; code: string };

type StockTakingRow = {
  counter: string;
  item: string;
  operator: string;
  slno: number;
};

export default function StockTakingScreen() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [shopCode, setShopCode] = useState("");
  const [baseUrl, setBaseUrlState] = useState("");
  const [isReady, setIsReady] = useState(false);

  const [formattedDate, setFormattedDate] = useState("");

  const formatDateForApi = (date: string): string => {
    const [day, month, year] = date.split("/");
    return `${year}-${month}-${day}`;
  };

  const [stockRows, setStockRows] = useState<StockTakingRow[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorModalVisible, setOperatorModalVisible] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(
    null,
  );

  const [stockSlno, setStockSlno] = useState<number | null>(null);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const savingStockRef = useRef(false);

  const lastMasterTap = useRef<{ index: number; time: number } | null>(null);

  const [popup, setPopup] = useState<{
    visible: boolean;
    message: string;
    confirmation: boolean;
    onConfirm?: () => void;
  }>({ visible: false, message: "", confirmation: false });

  const showError = (message: string) =>
    setPopup({ visible: true, message, confirmation: false });

  const showConfirm = (message: string, onConfirm: () => void) =>
    setPopup({ visible: true, message, confirmation: true, onConfirm });

  const closePopup = () =>
    setPopup({ visible: false, message: "", confirmation: false });

  const confirmPopup = () => {
    const action = popup.onConfirm;
    closePopup();
    action?.();
  };

  // Bootstrap: restore session
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedUrl = await getBaseUrl();
        const savedShop = await getShopCode();
        if (savedUrl) {
          setApiBaseUrl(savedUrl);
          setBaseUrlState(savedUrl);
        }
        if (savedShop) setShopCode(savedShop);
      } finally {
        setIsReady(true);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const loadCounters = async () => {
      try {
        setCounters(await getAllCounters());
      } catch {
        showError("Unable to load counters. Please try again.");
      }
    };
    void loadCounters();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    const loadOperators = async () => {
      try {
        setOperators(await getAllOperators());
      } catch {
        showError("Unable to load operators. Please try again.");
      }
    };
    void loadOperators();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    const loadSlno = async () => {
      try {
        setStockSlno(await getNextStockSerial());
      } catch {
        showError("Unable to get the next stock entry number.");
      }
    };
    void loadSlno();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;

    const loadTodayStockTaking = async () => {
      try {
        const databaseDate = await getDatabaseToday();
        const apiDate = formatDateForApi(databaseDate);
        if (cancelled) return;
        setFormattedDate(databaseDate);

        const deviceInfo = await getDeviceInfo();

        if (!deviceInfo.ip) {
          throw new Error("Unable to detect the device IP address.");
        }

        const records = await getStockTakingRecordsForDate(
          deviceInfo.ip,
          apiDate,
        );

        if (cancelled) return;

        setStockRows(
          records.map((record) => ({
            counter: record.counter,
            item: record.item,
            operator: record.operator,
            slno: Number(record.slno),
          })),
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load today's Stock Taking:", error);
        showError("Unable to load today's Stock Taking records.");
      }
    };

    void loadTodayStockTaking();

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  const deleteStockRow = async (index: number) => {
    const row = stockRows[index];
    if (!row) return;
    try {
      await deleteStockTaking(row.slno);
      setStockRows((prev) => prev.filter((_, i) => i !== index));
    } catch {
      showError("Unable to delete the stock entry. Please try again.");
    }
  };

  const handleAdd = async () => {
    if (savingStockRef.current) return;

    if (!selectedCounter) {
      showError("Please select a counter.");
      return;
    }

    if (!selectedItem) {
      showError("Please select an item.");
      return;
    }

    if (!selectedOperator) {
      showError("Please select an operator.");
      return;
    }

    if (!items.some((i) => i.code === selectedItem.code)) {
      showError(
        `Item ${selectedItem.code} does not belong to counter ${selectedCounter.code}.`,
      );
      return;
    }

    if (stockSlno === null) {
      showError("Stock entry number not available.");
      return;
    }

    if (!formattedDate) {
      showError("Stock-taking date is not available. Please try again.");
      return;
    }

    savingStockRef.current = true;
    setIsSavingStock(true);

    try {
      const apiDate = formatDateForApi(formattedDate);

      const deviceInfo = await getDeviceInfo();

      // Step 1: Register the device in the backend.
      const registeredDevice = await registerDevice({
        deviceName: deviceInfo.deviceName ?? "Unknown",
        deviceModel: deviceInfo.deviceModel ?? "Unknown",
        osVersion: deviceInfo.osVersion ?? "Unknown",
      });

      console.log(
        "Device registered. Backend UUID:",
        registeredDevice.deviceId,
      );

      // Step 2: Insert the stock-taking record.
      await insertStockTaking({
        slno: stockSlno,
        date: apiDate,
        operator: selectedOperator.code,
        counter: selectedCounter.code,
        item: selectedItem.code,
        macId: registeredDevice.deviceId,
        ip: deviceInfo.ip,
      });

      setStockRows((prev) => [
        ...prev,
        {
          counter: selectedCounter.code,
          item: selectedItem.code,
          operator: selectedOperator.code,
          slno: stockSlno,
        },
      ]);

      setSelectedCounter(null);
      setSelectedItem(null);
      setSelectedOperator(null);

      setStockSlno(await getNextStockSerial());
    } catch (error) {
      console.error("Stock Taking save failed:", error);
      showError("Unable to save the stock entry. Please try again.");
    } finally {
      savingStockRef.current = false;
      setIsSavingStock(false);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContent}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <HamburgerButton onPress={() => setIsDrawerOpen(true)} />
            <View style={styles.infoTitleWrap}>
              <Text style={styles.infoSubtitle}>AURIX</Text>
              <Text style={styles.infoTitle}>Stock Taking</Text>
            </View>
            <View style={styles.headerRightSpacer} />
          </View>
          <View style={styles.infoBar}>
            <View style={styles.infoValueBox}>
              <Text style={styles.infoLabel}>Shop</Text>
              <Text style={styles.infoValue}>{shopCode || "—"}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoValueBox}>
              <Text style={styles.infoLabel}>DATE</Text>
              <Text style={styles.infoDate}>{formattedDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.identificationRow}>
            <View style={styles.identificationField}>
              <Pressable
                style={styles.dropdownInput}
                onPress={() => setCounterModalVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownInputText,
                    { color: selectedCounter ? "#FFFFFF" : "#AAB3C5" },
                  ]}
                  numberOfLines={1}
                >
                  {selectedCounter ? selectedCounter.code : "Counter"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.itemField}>
              <Pressable
                style={styles.dropdownInput}
                onPress={() => {
                  if (!selectedCounter) {
                    showError("Please select a counter first.");
                    return;
                  }
                  setItemModalVisible(true);
                }}
              >
                <Text
                  style={[
                    styles.dropdownInputText,
                    { color: selectedItem ? "#FFFFFF" : "#AAB3C5" },
                  ]}
                  numberOfLines={1}
                >
                  {selectedItem ? selectedItem.code : "Item"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.smField}>
              <Pressable
                style={styles.dropdownInput}
                onPress={() => setOperatorModalVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownInputText,
                    { color: selectedOperator ? "#FFFFFF" : "#AAB3C5" },
                  ]}
                  numberOfLines={1}
                >
                  {selectedOperator ? selectedOperator.code : "Op"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.slnoField}>
              <View style={[styles.dropdownInput, styles.disabledInput]}>
                <Text
                  style={[styles.dropdownInputText, { color: "#D4AF37" }]}
                  numberOfLines={1}
                >
                  {stockSlno ?? "-"}
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, isSavingStock && { opacity: 0.5 }]}
              onPress={handleAdd}
              disabled={isSavingStock}
            >
              <Text style={styles.primaryButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.masterTable}>
          <View style={styles.masterHeaderRow}>
            <Text style={[styles.masterHeaderText, { flex: 1.2 }]}>
              COUNTER
            </Text>
            <Text style={[styles.masterHeaderText, { flex: 1.1 }]}>ITEM</Text>
            <Text style={[styles.masterHeaderText, { flex: 1.0 }]}>
              OPERATOR
            </Text>
            <Text style={[styles.masterHeaderText, { flex: 0.8 }]}>SLNO</Text>
            <Text
              style={[
                styles.masterHeaderText,
                { width: 36, textAlign: "center" },
              ]}
            >
              ACT
            </Text>
          </View>
          <FlatList
            data={stockRows}
            keyExtractor={(row) => String(row.slno)}
            style={styles.masterRows}
            contentContainerStyle={styles.masterRowsContent}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item: row, index }) => (
              <Pressable
                style={styles.masterDataRow}
                onPress={() => {
                  const now = Date.now();
                  const prev = lastMasterTap.current;
                  if (prev && prev.index === index && now - prev.time < 400) {
                    router.push({
                      pathname: "/stock-taking-detail",
                      params: {
                        baseUrl,
                        shopCode,
                        counter: row.counter,
                        item: row.item,
                        operator: row.operator,
                        slno: String(row.slno),
                      },
                    });
                    lastMasterTap.current = null;
                    return;
                  }
                  lastMasterTap.current = { index, time: now };
                }}
              >
                <Text
                  style={[styles.masterCell, { flex: 1.2 }]}
                  numberOfLines={1}
                >
                  {row.counter}
                </Text>
                <Text
                  style={[styles.masterCell, { flex: 1.1 }]}
                  numberOfLines={1}
                >
                  {row.item}
                </Text>
                <Text
                  style={[styles.masterCell, { flex: 1.0 }]}
                  numberOfLines={1}
                >
                  {row.operator}
                </Text>
                <Text
                  style={[styles.masterCell, { flex: 0.8, color: "#D4AF37" }]}
                  numberOfLines={1}
                >
                  {row.slno}
                </Text>
                <View style={styles.actionCellWrap}>
                  <Pressable
                    style={styles.masterDeleteButton}
                    onPress={() =>
                      showConfirm(`Delete stock entry ${row.slno}?`, () =>
                        deleteStockRow(index),
                      )
                    }
                  >
                    <Text style={styles.masterDeleteText}>×</Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyArea}>
                <Text style={styles.emptyText}>No data added</Text>
              </View>
            }
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© Blogtec Software LLP</Text>
        </View>
      </View>

      <UniversalTableModal
        visible={counterModalVisible}
        title="Select Counter"
        data={counters}
        columns={[
          { key: "name", title: "Counter", flex: 1.5 },
          { key: "code", title: "Code", flex: 1 },
        ]}
        searchPlaceholder="Search counter..."
        onSelect={(counter) => {
          setSelectedCounter(counter);
          setCounterModalVisible(false);
          getItemsByCounter(counter.code)
            .then((data) => setItems(data as Item[]))
            .catch(() => showError("Unable to load items."));
        }}
        onClose={() => setCounterModalVisible(false)}
      />

      <UniversalTableModal
        visible={itemModalVisible}
        title="Select Item"
        data={items}
        columns={[
          { key: "desc", title: "Item", flex: 1.5 },
          { key: "code", title: "Code", flex: 1 },
        ]}
        searchPlaceholder="Search item..."
        onSelect={(item) => {
          setSelectedItem(item);
          setItemModalVisible(false);
        }}
        onClose={() => setItemModalVisible(false)}
      />

      <UniversalTableModal
        visible={operatorModalVisible}
        title="Select Operator"
        data={operators}
        columns={[
          { key: "name", title: "Operator", flex: 1.5 },
          { key: "code", title: "Code", flex: 1 },
        ]}
        searchPlaceholder="Search operator..."
        onSelect={(op) => {
          setSelectedOperator(op);
          setOperatorModalVisible(false);
        }}
        onClose={() => setOperatorModalVisible(false)}
      />

      <ValidationPopup
        visible={popup.visible}
        message={popup.message}
        confirmation={popup.confirmation}
        onClose={closePopup}
        onConfirm={confirmPopup}
      />
      <AurixDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeRoute="stock-taking"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121826",
  },
  container: { flex: 1, backgroundColor: "#121826" },
  screenContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  infoCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    backgroundColor: "#1B2333",
    borderColor: "#303A4F",
    elevation: 4,
  },
  infoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  infoTitleWrap: {
    alignItems: "center",
    flex: 1,
  },

  headerRightSpacer: {
    width: 44,
  },

  _oldHeaderRow: { alignItems: "center", marginBottom: 14 },
  infoSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
    color: "#D4AF37",
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: "#FFFFFF",
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    backgroundColor: "#242D40",
    borderColor: "#303A4F",
  },
  infoValueBox: { flex: 1, justifyContent: "center" },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
    color: "#AAB3C5",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: "#FFFFFF",
  },
  infoDate: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    color: "#D4AF37",
  },
  infoDivider: { width: 1, marginHorizontal: 12, backgroundColor: "#303A4F" },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    backgroundColor: "#1B2333",
    borderColor: "#303A4F",
    elevation: 4,
  },
  identificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  identificationField: { flex: 1.2 },
  itemField: { flex: 1.1 },
  smField: { flex: 1.0 },
  slnoField: { flex: 0.8 },
  dropdownInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#242D40",
    borderColor: "#303A4F",
  },
  dropdownInputText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  disabledInput: { opacity: 0.85 },
  primaryButton: {
    width: 36,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
    elevation: 3,
  },
  primaryButtonText: { color: "#060914", fontSize: 20, fontWeight: "900" },
  masterTable: {
    flex: 1,
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#242D40",
    borderColor: "#303A4F",
  },
  masterRows: { flex: 1 },
  masterRowsContent: { flexGrow: 1 },
  masterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
    backgroundColor: "#242D40",
  },
  masterHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#D4AF37",
  },
  emptyArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 15, fontWeight: "600", color: "#AAB3C5" },
  masterDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
    backgroundColor: "#1B2333",
  },
  masterCell: {
    fontSize: 13,
    fontWeight: "600",
    paddingRight: 4,
    color: "#FFFFFF",
  },
  actionCellWrap: { width: 36, alignItems: "center", justifyContent: "center" },
  masterDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },
  masterDeleteText: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
    color: "#E74C3C",
  },
  footer: { alignItems: "center", paddingVertical: 12 },
  footerText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#D4AF37",
  },
});
