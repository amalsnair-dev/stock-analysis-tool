import { getDeviceInfo } from "@/services/deviceInfo";
import { getDeviceId } from "@/storage/localStorage";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ValidationPopup } from "@/components/ValidationPopup/ValidationPopup";
import { setApiBaseUrl } from "@/services/apiClient";
import {
  deleteStockTakingTransaction,
  getSoldStockTakingBarcodes,
  getStockTakingStoneTotals,
  getStockTakingTransactions,
  insertStockTakingTransaction,
  type StockTakingTransactionResponse,
} from "@/services/stockTakingApi";
import {
  addStoredTransaction,
  getStoredTransactions,
  removeStoredTransaction,
} from "@/services/stockTakingTransactionStore";
import {
  isValidStockBarcode,
  parseFriendlyApiError,
} from "@/services/validation";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

type StockTakingTransactionRow = StockTakingTransactionResponse & {
  isSold?: boolean;
  cwt?: number;
  cnos?: number;
};

export default function StockTakingDetailScreen() {
  const params = useLocalSearchParams<{
    baseUrl: string;
    shopCode: string;
    counter: string;
    item: string;
    operator: string;
    slno: string;
  }>();

  const baseUrl = params.baseUrl ?? "";
  const slno = Number(params.slno ?? "0");
  const row = {
    counter: params.counter ?? "",
    item: params.item ?? "",
    operator: params.operator ?? "",
    slno,
  };

  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const scannedRef = useRef(false);
  const scannedBarcodesRef = useRef(new Set<string>());
  const barcodeInputRef = useRef<TextInput | null>(null);
  const submittingRef = useRef(false);
  const scanSuccessPlayer = useAudioPlayer(
    require("../../assets/barcode-success.wav"),
  );

  const [barcode, setBarcode] = useState("");
  const [deleteBarcode, setDeleteBarcode] = useState<string | null>(null);
  const [transactionRows, setTransactionRows] = useState<
    StockTakingTransactionRow[]
  >(() => getStoredTransactions(slno));
  const pendingScanSoundBarcodeRef = useRef<string | null>(null);

  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const totals = useMemo(
    () =>
      transactionRows.reduce(
        (sum, transaction) => {
          const qty = Number(transaction.qty || 0);
          const netWt = Number(transaction.grossWt || 0);
          const caratWt = Number(transaction.cwt || 0);
          const caratNos = Number(transaction.cnos || 0);

          sum.qty += qty;
          sum.netWt += netWt;
          sum.caratWt += caratWt;
          sum.caratNos += caratNos;

          if (transaction.isSold) {
            sum.soldCount += 1;
            sum.soldQty += qty;
            sum.soldNetWt += netWt;
            sum.soldCaratWt += caratWt;
            sum.soldCaratNos += caratNos;
          }

          return sum;
        },
        {
          qty: 0,
          netWt: 0,
          caratWt: 0,
          caratNos: 0,
          soldCount: 0,
          soldQty: 0,
          soldNetWt: 0,
          soldCaratWt: 0,
          soldCaratNos: 0,
        },
      ),
    [transactionRows],
  );

  const totalQty = totals.qty;
  const totalNetWt = totals.netWt;
  const totalSoldQty = totals.soldQty;
  const totalSoldNetWt = totals.soldNetWt;
  const totalCaratWt = totals.caratWt;
  const totalCaratNos = totals.caratNos;
  const totalSoldCaratWt = totals.soldCaratWt;
  const totalSoldCaratNos = totals.soldCaratNos;

  const balanceQty = totalQty - totalSoldQty;
  const balanceNetWt = totalNetWt - totalSoldNetWt;
  const balanceCaratWt = totalCaratWt - totalSoldCaratWt;
  const balanceCaratNos = totalCaratNos - totalSoldCaratNos;
  const hasCaratDetails = totalCaratWt > 0 || totalCaratNos > 0;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    }).catch((error) => {
      console.warn("Stock taking: audio mode setup failed:", error);
    });
  }, []);

  useEffect(() => {
    const pendingBarcode = pendingScanSoundBarcodeRef.current;
    if (
      !pendingBarcode ||
      !transactionRows.some(
        (transaction) => transaction.barcode === pendingBarcode,
      )
    ) {
      return;
    }

    pendingScanSoundBarcodeRef.current = null;
    void (async () => {
      try {
        await scanSuccessPlayer.seekTo(0);
        scanSuccessPlayer.play();
      } catch (error) {
        console.warn("Stock taking: scan success sound failed:", error);
      }
    })();
  }, [transactionRows, scanSuccessPlayer]);

  useEffect(() => {
    if (baseUrl) setApiBaseUrl(baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      setIsLoadingTransactions(true);

      try {
        const records = await getStockTakingTransactions(slno);
        const barcodes = records.map((record) => record.barcode);

        const [soldBarcodeList, stoneTotals] = await Promise.all([
          getSoldStockTakingBarcodes(barcodes),
          getStockTakingStoneTotals(barcodes),
        ]);

        const soldBarcodes = new Set(soldBarcodeList);
        const stoneTotalsByBarcode = new Map(
          stoneTotals.map((stone) => [stone.barcode, stone]),
        );

        if (!cancelled) {
          setTransactionRows(
            records.map((record) => {
              const stone = stoneTotalsByBarcode.get(record.barcode);

              return {
                ...record,
                isSold: soldBarcodes.has(record.barcode),
                cwt: stone?.cwt ?? 0,
                cnos: stone?.cnos ?? 0,
              };
            }),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            "Unable to load barcode entries for this stock entry.",
          );
          console.error("Failed to fetch stock transactions:", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTransactions(false);
        }
      }
    };

    if (slno > 0) {
      void loadTransactions();
    } else {
      setTimeout(() => {
        if (!cancelled) {
          setIsLoadingTransactions(false);
          setErrorMessage("Invalid stock entry serial number.");
        }
      }, 0);
    }

    return () => {
      cancelled = true;
    };
  }, [slno, refreshKey]);

  const normalizeBarcode = (value: string): string => {
    const trimmed = value.trim().toUpperCase();
    const suffixMatch = trimmed.match(/^([0-9]+)([A-Z]?)$/);

    if (!suffixMatch) return trimmed;

    const [, numericPart, suffix = ""] = suffixMatch;
    const targetLength = suffix ? 9 : 10;

    return `${numericPart.padStart(targetLength, "0")}${suffix}`;
  };

  const addBarcode = async (value: string = barcode): Promise<boolean> => {
    if (submittingRef.current) return false;

    const trimmedBarcode = value.trim();

    if (!trimmedBarcode) {
      setErrorMessage("Please enter or scan a barcode.");
      return false;
    }

    const formattedBarcode = normalizeBarcode(trimmedBarcode);

    if (
      transactionRows.some(
        (transaction) =>
          normalizeBarcode(transaction.barcode) === formattedBarcode,
      )
    ) {
      setErrorMessage(
        `This barcode has already been added '${formattedBarcode}'.`,
      );
      return false;
    }

    if (!isValidStockBarcode(formattedBarcode)) {
      setBarcode("");
      setErrorMessage("Invalid barcode. Only letters and numbers are allowed.");
      return false;
    }

    setBarcode(formattedBarcode);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const deviceInfo = await getDeviceInfo();

      const deviceId = await getDeviceId();

      console.log("[StockTaking] deviceId from SecureStore:", deviceId);
      console.log("[StockTaking] slno from SecureStore:", slno);
      console.log("[StockTaking] barcode from SecureStore:", barcode);

      if (!deviceId) {
        setErrorMessage("Device ID is missing. Please select the shop again.");
        return false;
      }

      const result = await insertStockTakingTransaction({
        slno,
        barcode: formattedBarcode,
        macId: deviceId,
        ip: deviceInfo.ip,
      });

      addStoredTransaction(slno, result);
      setTransactionRows((prev) => [
        ...prev,
        {
          ...result,
          isSold: false,
          cwt: 0,
          cnos: 0,
        },
      ]);

      setBarcode("");
      setErrorMessage("");

      void getStockTakingStoneTotals([result.barcode])
        .then((stoneTotals) => {
          const stone = stoneTotals.find(
            (item) => item.barcode === result.barcode,
          );
          if (!stone) return;

          setTransactionRows((prev) =>
            prev.map((transaction) =>
              transaction.barcode === result.barcode
                ? { ...transaction, cwt: stone.cwt, cnos: stone.cnos }
                : transaction,
            ),
          );
        })
        .catch((stoneError: unknown) => {
          console.error(
            "Failed to load stone details for new barcode:",
            stoneError,
          );
        });

      return true;
    } catch (error) {
      setBarcode("");
      setErrorMessage(
        parseFriendlyApiError(
          error,
          "Barcode not found or invalid. Please try again.",
        ),
      );
      return false;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!deleteBarcode) return;

    const barcodeToDelete = deleteBarcode;
    setDeleteBarcode(null);

    try {
      await deleteStockTakingTransaction(barcodeToDelete);
      removeStoredTransaction(slno, barcodeToDelete);
      setTransactionRows((prev) =>
        prev.filter((t) => t.barcode !== barcodeToDelete),
      );
    } catch {
      setErrorMessage("Unable to delete transaction.");
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        setErrorMessage("Camera permission required to scan barcodes.");
        return;
      }
    }

    scannedBarcodesRef.current.clear();
    scannedRef.current = false;
    setIsScannerVisible(true);
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scannedRef.current) return;

    const formattedBarcode = normalizeBarcode(result.data);
    if (scannedBarcodesRef.current.has(formattedBarcode)) return;

    scannedRef.current = true;
    try {
      const isInvalidBarcode = !isValidStockBarcode(formattedBarcode);
      const isDuplicateBarcode = transactionRows.some(
        (transaction) =>
          normalizeBarcode(transaction.barcode) === formattedBarcode,
      );

      if (isDuplicateBarcode) {
        setErrorMessage(
          `This barcode has already been added '${formattedBarcode}'.`,
        );
        setIsScannerVisible(false);
        return;
      }

      if (isInvalidBarcode) {
        await addBarcode(result.data);
        setIsScannerVisible(false);
        return;
      }

      pendingScanSoundBarcodeRef.current = formattedBarcode;
      const wasAdded = await addBarcode(formattedBarcode);
      if (!wasAdded) {
        pendingScanSoundBarcodeRef.current = null;
        setIsScannerVisible(false);
      } else {
        scannedBarcodesRef.current.add(formattedBarcode);
      }
    } finally {
      setBarcode("");
      scannedRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={isLoadingTransactions ? [] : transactionRows}
        keyExtractor={(transaction) => transaction.barcode}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <Text style={styles.eyebrow}>STOCK ENTRY DETAILS</Text>
          <View style={styles.headerSpacer} />

          <Pressable
            style={[
              styles.refreshButton,
              isLoadingTransactions && styles.refreshButtonDisabled,
            ]}
            onPress={() => {
              setErrorMessage("");
              setIsLoadingTransactions(true);
              setRefreshKey((current) => current + 1);
            }}
            disabled={isLoadingTransactions}
            accessibilityRole="button"
            accessibilityLabel="Refresh stock transactions"
          >
            {isLoadingTransactions ? (
              <ActivityIndicator color="#060914" size="small" />
            ) : (
              <Text style={styles.refreshText}>↻</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          {[
            { label: "COUNTER", value: row.counter },
            { label: "ITEM", value: row.item },
            { label: "OPERATOR", value: row.operator },
            { label: "SLNO", value: String(row.slno) },
          ].map(({ label, value }) => (
            <View key={label} style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={styles.summaryValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.barcodeRow}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={barcodeInputRef}
                style={styles.input}
                value={barcode}
                onChangeText={(text) => {
                  setBarcode(text);
                  setErrorMessage("");
                }}
                placeholder="Enter barcode"
                placeholderTextColor="#AAB3C5"
                autoCorrect={false}
                autoCapitalize="characters"
                onSubmitEditing={() => addBarcode()}
                editable={!isSubmitting}
              />

              <Pressable style={styles.scanInsideButton} onPress={openScanner}>
                <Text style={styles.scanText}>SCAN</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.addButton, isSubmitting && styles.disabledButton]}
              onPress={() => addBarcode()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#060914" size="small" />
              ) : (
                <Text style={styles.addButtonText}>+</Text>
              )}
            </Pressable>
          </View>

          {!!errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            styles.tableCard,
            styles.transactionListHeader,
          ]}
        >
          {isScannerVisible && (
            <View style={styles.scannerContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "aztec",
                    "codabar",
                    "code39",
                    "code93",
                    "code128",
                    "datamatrix",
                    "ean13",
                    "ean8",
                    "itf14",
                    "pdf417",
                    "qr",
                    "upc_a",
                    "upc_e",
                  ],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close scanner"
                style={styles.scannerCloseButton}
                onPress={() => setIsScannerVisible(false)}
              >
                <Text style={styles.scannerCloseText}>×</Text>
              </Pressable>

              <View style={styles.scannerInstruction}>
                <Text style={styles.scannerInstructionText}>Scan Barcode</Text>
              </View>
            </View>
          )}

          <View style={styles.transactionHeaderRow}>
            <Text
              style={[
                styles.transactionHeaderText,
                styles.transactionSlnoColumn,
              ]}
            >
              SLNO
            </Text>

            <Text
              style={[
                styles.transactionHeaderText,
                styles.transactionBarcodeColumn,
              ]}
            >
              BARCODE
            </Text>

            <Text
              style={[
                styles.transactionHeaderText,
                styles.transactionCodeColumn,
              ]}
            >
              CODE
            </Text>

            <Text
              style={[
                styles.transactionHeaderText,
                styles.transactionQtyColumn,
              ]}
            >
              QTY
            </Text>

            <Text
              style={[
                styles.transactionHeaderText,
                styles.transactionNetWtColumn,
              ]}
            >
              GRS.WT
            </Text>

            <View style={styles.transactionActionColumn} />
          </View>

        </View>
          </>
        }
        renderItem={({ item: t, index }) => (
          <View
            style={[
              styles.transactionRow,
              t.isSold && styles.soldTransactionRow,
            ]}
          >
            <Text style={styles.transactionSlno}>{index + 1}</Text>
            <Text style={styles.transactionBarcode}>{t.barcode}</Text>
            <Text style={styles.transactionCode}>{t.code}</Text>
            <Text style={styles.transactionQty}>{t.qty}</Text>
            <Text style={styles.transactionNetWt}>
              {Number(t.grossWt ?? 0).toFixed(3)}
            </Text>

            <Pressable
              onPress={() => setDeleteBarcode(t.barcode)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>×</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.transactionEmptyRow}>
            {isLoadingTransactions ? (
              <>
                <ActivityIndicator color="#D4AF37" size="large" />
                <Text style={styles.emptyText}>Loading barcode entries...</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>No barcodes added</Text>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={[styles.card, styles.stockTotalsCard]}>
          <View style={styles.totalsSection}>
            <Text style={styles.totalsTitle}>STOCK TOTALS</Text>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                {hasCaratDetails ? "Total Qty / Carat Nos" : "Total Qty"}
              </Text>
              <Text style={styles.totalsValue}>
                {hasCaratDetails ? `${totalQty} / ${totalCaratNos}` : totalQty}
              </Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                {hasCaratDetails ? "Total Wt / Carat Wt" : "Total Weight"}
              </Text>
              <Text style={styles.totalsValue}>
                {hasCaratDetails
                  ? `${totalNetWt.toFixed(3)} / ${totalCaratWt.toFixed(3)}`
                  : totalNetWt.toFixed(3)}
              </Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                {hasCaratDetails ? "Sold Qty / Carat Nos" : "Sold Qty"}
              </Text>
              <Text style={styles.totalsValue}>
                {hasCaratDetails
                  ? `${totalSoldQty} / ${totalSoldCaratNos}`
                  : totalSoldQty}
              </Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                {hasCaratDetails ? "Sold Wt / Carat Wt" : "Sold Weight"}
              </Text>
              <Text style={styles.totalsValue}>
                {hasCaratDetails
                  ? `${totalSoldNetWt.toFixed(3)} / ${totalSoldCaratWt.toFixed(3)}`
                  : totalSoldNetWt.toFixed(3)}
              </Text>
            </View>

            {totals.soldCount > 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    {hasCaratDetails
                      ? "Balance Qty / Carat Nos"
                      : "Balance Qty"}
                  </Text>
                  <Text style={styles.totalsValue}>
                    {hasCaratDetails
                      ? `${balanceQty} / ${balanceCaratNos}`
                      : balanceQty}
                  </Text>
                </View>

                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    {hasCaratDetails
                      ? "Balance Wt / Carat Wt"
                      : "Balance Weight"}
                  </Text>
                  <Text style={styles.totalsValue}>
                    {hasCaratDetails
                      ? `${balanceNetWt.toFixed(3)} / ${balanceCaratWt.toFixed(3)}`
                      : balanceNetWt.toFixed(3)}
                  </Text>
                </View>
              </>
            )}
          </View>
          </View>
        }
      />

      <ValidationPopup
        visible={deleteBarcode !== null}
        confirmation
        message={`Delete barcode ${deleteBarcode ?? ""}?`}
        confirmText="Delete"
        onClose={() => setDeleteBarcode(null)}
        onConfirm={confirmDeleteTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121826" },
  content: { flexGrow: 1, padding: 16 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  backText: {
    fontSize: 38,
    fontWeight: "300",
    lineHeight: 38,
    color: "#D4AF37",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#D4AF37",
  },

  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    borderWidth: 1,
    backgroundColor: "#1B2333",
    borderColor: "#303A4F",
    elevation: 3,
  },
  summaryColumn: { flex: 1, alignItems: "center" },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    color: "#AAB3C5",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    color: "#FFFFFF",
  },

  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    backgroundColor: "#1B2333",
    borderColor: "#303A4F",
    elevation: 3,
  },
  tableCard: { padding: 0, overflow: "hidden" },

  barcodeRow: { flexDirection: "row", alignItems: "center" },
  inputContainer: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#242D40",
    borderColor: "#303A4F",
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scanInsideButton: {
    height: 40,
    paddingHorizontal: 14,
    marginRight: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
  },
  scanText: { fontWeight: "800", color: "#060914", fontSize: 14 },
  addButton: {
    width: 46,
    height: 52,
    marginLeft: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
  },
  disabledButton: { opacity: 0.5 },
  addButtonText: { color: "#060914", fontSize: 22, fontWeight: "900" },
  errorText: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 13,
    color: "#E74C3C",
  },

  emptyText: { fontWeight: "600", fontSize: 14, color: "#AAB3C5" },
  transactionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#303A4F",
    backgroundColor: "#242D40",
  },
  transactionHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#D4AF37",
    paddingHorizontal: 8,
  },
  transactionListHeader: { marginBottom: 0 },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#303A4F",
    backgroundColor: "#1B2333",
  },
  soldTransactionRow: {
    backgroundColor: "rgba(242, 220, 25, 0.22)",
  },
  transactionEmptyRow: {
    height: 340,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#303A4F",
  },

  transactionSlnoColumn: {
    width: 42,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  transactionSlno: {
    width: 42,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#AAB3C5",
    textAlign: "center",
  },
  transactionBarcodeColumn: { flex: 1.5, paddingHorizontal: 8 },
  transactionCodeColumn: { flex: 1, paddingHorizontal: 8 },
  transactionQtyColumn: {
    flex: 0.7,
    paddingHorizontal: 8,
    textAlign: "right",
  },
  transactionNetWtColumn: {
    flex: 1,
    paddingHorizontal: 8,
    textAlign: "right",
  },
  transactionActionColumn: { width: 42, paddingHorizontal: 4 },
  transactionBarcode: {
    flex: 1.5,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  transactionCode: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#AAB3C5",
  },
  transactionQty: {
    flex: 0.7,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#AAB3C5",
    textAlign: "right",
  },
  transactionNetWt: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#AAB3C5",
    textAlign: "right",
  },
  deleteButton: {
    width: 32,
    height: 32,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220,38,38,0.12)",
  },
  deleteText: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
    color: "#E74C3C",
  },

  totalsSection: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#303A4F",
    backgroundColor: "#242D40",
  },
  totalsTitle: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "800",
    color: "#D4AF37",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#AAB3C5",
  },
  totalsValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stockTotalsCard: { padding: 8 },

  scannerContainer: {
    width: "100%",
    height: 200,
    marginBottom: 8,
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.65)",
    backgroundColor: "#060914",
  },
  scannerCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(6,9,20,0.85)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerCloseText: {
    fontSize: 32,
    fontWeight: "400",
    color: "#D4AF37",
    lineHeight: 34,
  },
  scannerInstruction: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scannerInstructionText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D4AF37",
    letterSpacing: 1,
  },

  headerSpacer: { flex: 1 },
  refreshButton: {
    width: 42,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
  },
  refreshButtonDisabled: { opacity: 0.6 },
  refreshText: {
    color: "#060914",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
});
