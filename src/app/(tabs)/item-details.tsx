import AurixDrawer from "@/components/navigation/AurixDrawer";
import HamburgerButton from "@/components/navigation/HamburgerButton";
import { setApiBaseUrl } from "@/services/apiClient";
import {
  estimateReceiptToHtml,
  formatEstimateReceipt,
} from "@/services/estimateReceipt";
import {
  checkBarcodeEstimate,
  checkBarcodeStoneWeight,
  createCrmCustomer,
  createSalesEntry,
  getAllCrmCustomers,
  getBarcodeDetails,
  getCareOfs,
  getCrmCustomerById,
  getCrmCustomerByMobile,
  getDatabaseToday,
  getDeviceDatabaseId,
  getGoldSilverRates,
  getItemRate,
  getSalesmen,
  updateCrmCustomer,
  type BarcodeDetailsResponse,
  type BarcodeItemDetail,
  type CareOfMaster,
  type CrmCustomerResponse,
  type SalesmanMaster,
} from "@/services/itemApi";
import { getCustomerIdValidationError } from "@/services/validation";
import {
  getBaseUrl,
  getDeviceId,
  getPassword,
  getShopCode,
  getUsername,
} from "@/storage/localStorage";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Print from "expo-print";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDateForApi = (date: string): string => {
  const [day, month, year] = date.split("/");

  return `${year}-${month}-${day}`;
};

const formatAmount = (value?: number | string | null): string => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim())
  ) {
    return "-";
  }

  const amount = typeof value === "string" ? Number(value.trim()) : value;
  return Number.isFinite(amount) ? amount.toFixed(2) : "-";
};

const formatWeight = (value?: number | string | null): string => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim())
  ) {
    return "-";
  }

  const weight = typeof value === "string" ? Number(value.trim()) : value;
  return Number.isFinite(weight) ? weight.toFixed(3) : "-";
};

type SalesEntryItem = BarcodeItemDetail & {
  // The barcode API response includes gstPercent, although the shared
  // BarcodeItemDetail type does not currently declare it.
  gstPercent?: number | string | null;
  selected: boolean;
  stoneDetails?: BarcodeDetailsResponse["StoneDetails"];
};

export default function MainScreen() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const isSubmittingRef = useRef(false);

  const [isCustomerDetailsVisible, setIsCustomerDetailsVisible] =
    useState(false);

  const [isCustomerListVisible, setIsCustomerListVisible] = useState(false);
  const [customerList, setCustomerList] = useState<CrmCustomerResponse[]>([]);
  const [isCustomerListLoading, setIsCustomerListLoading] = useState(false);
  const [customerPageNumber, setCustomerPageNumber] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState<number | null>(
    null,
  );

  const lastCustomerIdTapRef = useRef(-1);
  const skipCustomerIdBlurRef = useRef(false);

  const [customerDetails, setCustomerDetails] = useState({
    phoneNumber: "",
    custId: "",
    crmid: "",
    name: "",
    aadhar: "",
    gstNo: "",
    panNo: "",
    careOf: "",
    add1: "",
    add2: "",
    place: "",
    pincode: "",
    salesman: "",
  });

  const [salesmen, setSalesmen] = useState<SalesmanMaster[]>([]);
  const [isSalesmanVisible, setIsSalesmanVisible] = useState(false);

  const [careOfs, setCareOfs] = useState<CareOfMaster[]>([]);
  const [isCareOfVisible, setIsCareOfVisible] = useState(false);
  const [careOfSearch, setCareOfSearch] = useState("");
  const filteredCareOfs = useMemo(() => {
    const search = careOfSearch.trim().toLowerCase();
    return careOfs.filter(
      (careOf) =>
        !search ||
        careOf.careofname?.toLowerCase().includes(search) ||
        careOf.careofcode?.toLowerCase().includes(search),
    );
  }, [careOfs, careOfSearch]);

  const [isMetalMenuVisible, setIsMetalMenuVisible] = useState(false);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] =
    useState(false);
  const [itemIndexToRemove, setItemIndexToRemove] = useState<number | null>(
    null,
  );
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const barcodeInputRef = useRef<TextInput>(null);
  const hasScannedRef = useRef(false);
  const scannedBarcodesRef = useRef(new Set<string>());
  const lastRowTapRef = useRef({ index: -1, tappedAt: 0 });
  const scanSuccessPlayer = useAudioPlayer(
    require("../../../assets/barcode-success.wav"),
  );
  const [rightValue, setRightValue] = useState("");

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    }).catch((error) => {
      console.warn("MAIN: audio mode setup failed:", error);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDatabaseDate = async () => {
      try {
        const baseUrl = await getBaseUrl();

        if (!baseUrl) {
          throw new Error("Branch API URL not found.");
        }

        setApiBaseUrl(baseUrl);

        const databaseDate = await getDatabaseToday();

        if (isMounted) {
          setRightValue(databaseDate);
          console.log("DATABASE TODAY:", databaseDate);
        }
      } catch (error) {
        console.error("Failed to fetch database date:", error);

        if (isMounted) {
          Alert.alert(
            "Date Error",
            error instanceof Error
              ? error.message
              : "Unable to fetch date from database.",
          );
        }
      }
    };

    void loadDatabaseDate();

    return () => {
      isMounted = false;
    };
  }, []);
  const [leftValue, setLeftValue] = useState("");

  const [selectedMetal, setSelectedMetal] = useState("Gold");
  const [itemDetails, setItemDetails] = useState<SalesEntryItem[]>([]);
  const selectedItems = useMemo(
    () => itemDetails.filter((item) => item.selected),
    [itemDetails],
  );
  const tableItems = useMemo(
    () => (itemDetails.length > 0 ? itemDetails : [null]),
    [itemDetails],
  );
  const itemTotals = useMemo(
    () =>
      selectedItems.reduce<{
        gstAmount: number;
        netAmount: number;
        taxableAmount: number;
      }>(
        (totals, item) => {
          const gstAmount = Number(item.gstAmount);
          const netAmount = Number(item.netAmount);
          const taxableAmount = Number(item.taxableAmount);

          return {
            gstAmount:
              totals.gstAmount + (Number.isFinite(gstAmount) ? gstAmount : 0),
            netAmount:
              totals.netAmount + (Number.isFinite(netAmount) ? netAmount : 0),
            taxableAmount:
              totals.taxableAmount +
              (Number.isFinite(taxableAmount) ? taxableAmount : 0),
          };
        },
        { gstAmount: 0, netAmount: 0, taxableAmount: 0 },
      ),
    [selectedItems],
  );
  const visibleCustomerPages =
    customerTotalPages === null
      ? []
      : Array.from(
          {
            length: Math.min(customerTotalPages, 5),
          },
          (_, index) =>
            Math.max(
              1,
              Math.min(
                customerPageNumber - 2,
                customerTotalPages - Math.min(customerTotalPages, 5) + 1,
              ),
            ) + index,
        );

  const renderCustomerField = (
    field: keyof typeof customerDetails,
    label: string,
    fullWidth = false,
    narrow = false,
  ) => (
    <View
      key={field}
      style={[
        styles.customerField,
        fullWidth && styles.customerFieldFull,
        narrow && styles.customerFieldNarrow,
      ]}
    >
      <Text style={styles.customerFieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={customerDetails[field]}
        onChangeText={(value) => {
          const fieldValue =
            field === "aadhar"
              ? value.replace(/\D/g, "").slice(0, 12)
              : field === "panNo"
                ? value.slice(0, 10).toUpperCase()
                : field === "gstNo"
                  ? value
                      .replace(/[^a-z0-9]/gi, "")
                      .slice(0, 15)
                      .toUpperCase()
                  : value;
          setCustomerDetails((current) => ({
            ...current,
            [field]: fieldValue,
          }));
        }}
        onPressIn={field === "custId" ? handleCustomerIdPressIn : undefined}
        onBlur={
          field === "phoneNumber"
            ? handleCustomerPhoneBlur
            : field === "custId"
              ? handleCustomerIdBlur
              : undefined
        }
        keyboardType={
          field === "phoneNumber"
            ? "phone-pad"
            : field === "aadhar"
              ? "numeric"
              : field === "pincode"
                ? "numeric"
                : "default"
        }
        maxLength={
          field === "aadhar"
            ? 12
            : field === "panNo"
              ? 10
              : field === "gstNo"
                ? 15
                : undefined
        }
        accessibilityHint={
          field === "custId"
            ? "Double-tap to choose a customer from the customer list"
            : undefined
        }
        placeholderTextColor="#8A93A6"
        style={styles.customerFieldInput}
      />
    </View>
  );

  const renderSalesmanField = () => (
    <View style={[styles.customerField, styles.customerSelectorField]}>
      <Text style={styles.customerFieldLabel}>Salesman</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select Salesman"
        onPress={handleSalesmanPress}
        style={({ pressed }) => [
          styles.salesmanFieldInput,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.salesmanFieldText}>
          {customerDetails.salesman || "Select"}
        </Text>
      </Pressable>
    </View>
  );

  const renderCareOfField = () => (
    <View style={[styles.customerField, styles.customerSelectorField]}>
      <Text style={styles.customerFieldLabel}>Care Of</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select Care Of"
        onPress={handleCareOfPress}
        style={({ pressed }) => [
          styles.salesmanFieldInput,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.salesmanFieldText}>
          {customerDetails.careOf || "Select"}
        </Text>
      </Pressable>
    </View>
  );

  const applyCustomerDetails = (
    customer: CrmCustomerResponse,
    fallbackCustId = "",
    includeSalesman = true,
  ) => {
    const custId =
      customer.custid ?? customer.custId ?? customer.code ?? fallbackCustId;

    setCustomerDetails((current) => ({
      ...current,
      custId,
      crmid: String(customer.crmid ?? custId),
      phoneNumber: customer.mob ?? current.phoneNumber,
      name: customer.name ?? "",
      aadhar: String(customer.aadharno ?? ""),
      gstNo: customer.gstin ?? "",
      panNo: customer.pan ?? "",
      add1: customer.add1 ?? "",
      add2: customer.add2 ?? "",
      place: customer.add3 ?? customer.place ?? "",
      pincode: customer.pincode ?? "",
      ...(includeSalesman
        ? { salesman: customer.smanname ?? customer.salesman ?? "" }
        : {}),
    }));
  };

  const handleCustomerPhoneBlur = async () => {
    const mobile = customerDetails.phoneNumber.trim();

    if (!mobile) {
      return;
    }

    try {
      const customer = await getCrmCustomerByMobile(mobile);

      if (!customer?.custid && !customer?.custId && !customer?.code) {
        // No existing customer found.
        // Keep the entered phone number and allow manual entry.
        setCustomerDetails((current) => ({
          ...current,
          custId: "",
          crmid: "",
          name: "",
          aadhar: "",
          gstNo: "",
          panNo: "",
          add1: "",
          add2: "",
          place: "",
          pincode: "",
        }));

        return;
      }

      applyCustomerDetails(customer, "", false);
    } catch (error) {
      console.error("CRM customer lookup failed:", error);
    }
  };

  const handleCustomerIdBlur = async () => {
    if (skipCustomerIdBlurRef.current) {
      skipCustomerIdBlurRef.current = false;
      return;
    }

    const custid = customerDetails.custId.trim();

    if (!custid) {
      return;
    }

    try {
      const customer = await getCrmCustomerById(custid);

      console.log("CUSTOMER ID LOOKUP RESPONSE:", customer);

      if (!customer) {
        console.log("No customer found for Customer ID:", custid);
        void handleCustomerListPress();
        return;
      }

      applyCustomerDetails(customer, custid);
    } catch (error) {
      console.error("Customer ID lookup failed:", error);
      Alert.alert(
        "Customer Lookup Error",
        error instanceof Error
          ? error.message
          : "Unable to look up this customer.",
      );
    }
  };

  const handleCustomerIdPressIn = (
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) => {
    const now = event.nativeEvent.timestamp;

    if (
      lastCustomerIdTapRef.current >= 0 &&
      now - lastCustomerIdTapRef.current < 350
    ) {
      lastCustomerIdTapRef.current = -1;
      skipCustomerIdBlurRef.current = true;
      Keyboard.dismiss();
      void handleCustomerListPress();
      return;
    }

    lastCustomerIdTapRef.current = now;
  };

  const handleCustomerListPress = async (
    requestedPage = customerPageNumber,
  ) => {
    if (isCustomerListLoading) {
      return;
    }

    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
      return;
    }

    Keyboard.dismiss();
    setCustomerList([]);
    setCustomerPageNumber(requestedPage);
    setIsCustomerListVisible(true);
    setIsCustomerListLoading(true);

    try {
      const result = await getAllCrmCustomers(requestedPage, 20);

      setCustomerList(result.customers);
      setCustomerTotalPages(result.totalPages);
    } catch (error) {
      console.error("Failed to fetch CRM customers:", error);
      setIsCustomerListVisible(false);

      Alert.alert(
        "Customer Error",
        error instanceof Error ? error.message : "Unable to load customers.",
      );
    } finally {
      skipCustomerIdBlurRef.current = false;
      setIsCustomerListLoading(false);
    }
  };

  const handleCustomerSelect = async (customerId: string) => {
    if (!customerId || isCustomerListLoading) {
      return;
    }

    setIsCustomerListLoading(true);

    try {
      const customer = await getCrmCustomerById(customerId);

      if (!customer) {
        Alert.alert(
          "Customer Not Found",
          "This customer is no longer available. Please select another customer.",
        );
        return;
      }

      applyCustomerDetails(customer, customerId);
      setIsCustomerListVisible(false);
    } catch (error) {
      console.error("Failed to load selected CRM customer:", error);
      Alert.alert(
        "Customer Error",
        error instanceof Error
          ? error.message
          : "Unable to load the selected customer.",
      );
    } finally {
      setIsCustomerListLoading(false);
    }
  };

  const normalizeBarcode = (value: string): string => {
    const trimmed = value.trim().toUpperCase();

    if (!trimmed) {
      return "";
    }

    const match = trimmed.match(/^(\d+)([A-Z]*)$/);
    if (!match) {
      return trimmed;
    }

    const numericPart = match[1];
    const suffix = match[2];

    const targetLength = suffix ? 9 : 10;

    return numericPart.padStart(targetLength, "0") + suffix;
  };

  const handleBarcodeBlur = () => {
    setBarcode((currentBarcode) => normalizeBarcode(currentBarcode));
  };

  const handleScan = async () => {
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          setErrorMessage("Allow camera access to scan a barcode.");
          return;
        }
      }

      hasScannedRef.current = false;
      scannedBarcodesRef.current.clear();
      setErrorMessage("");
      setIsScannerVisible(true);
    } catch (error) {
      Alert.alert(
        "Camera Error",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleAdd = async (
    value: string = barcode,
    wasScanned = false,
  ): Promise<boolean> => {
    const normalizedBarcode = normalizeBarcode(value);

    if (!normalizedBarcode) {
      setBarcode("");
      setErrorMessage("Please enter a barcode.");
      setIsScannerVisible(false);
      return false;
    }

    if (
      itemDetails.some(
        (detail) =>
          detail.barcode &&
          normalizeBarcode(detail.barcode) === normalizedBarcode,
      )
    ) {
      setBarcode("");
      setErrorMessage(
        `This barcode has already been added '${normalizedBarcode}'.`,
      );
      setIsScannerVisible(false);
      hasScannedRef.current = false;
      return false;
    }

    const rejectBarcode = (message: string) => {
      setBarcode("");
      setErrorMessage(message);
      setIsScannerVisible(false);
      hasScannedRef.current = false;
      return false;
    };

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setLeftValue("");

      console.log("MAIN: barcode:", normalizedBarcode);

      const baseUrl = await getBaseUrl();
      const shopCode = await getShopCode();
      if (!baseUrl) {
        throw new Error(
          "Branch API URL not found. Please select your shop again.",
        );
      }
      if (!shopCode) {
        throw new Error("Shop code not found. Please select your shop again.");
      }
      setApiBaseUrl(baseUrl);

      let conflictingEstimateNo: number | null;
      try {
        conflictingEstimateNo = await checkBarcodeEstimate(
          normalizedBarcode,
          null,
        );
      } catch (error) {
        console.error("MAIN: barcode estimate validation failed:", error);
        Alert.alert(
          "Barcode Validation Error",
          error instanceof Error
            ? error.message
            : "Unable to validate this barcode. Please try again.",
        );
        return rejectBarcode("Unable to validate barcode. Please try again.");
      }

      if (conflictingEstimateNo !== null) {
        setBarcode("");
        setNotice({
          title: "Invalid Barcode",
          message: `Barcode exists in (${conflictingEstimateNo}) estimate`,
        });
        setIsScannerVisible(false);
        hasScannedRef.current = false;
        return false;
      }

      const result = await getItemRate(normalizedBarcode);

      console.log("MAIN: rate response:", result);

      if (result.sold === true) {
        setLeftValue("");
        return rejectBarcode("Item is sold.");
      }

      if (!result.barcode) {
        return rejectBarcode("No unsold item found for this barcode.");
      }

      const category = result.category?.trim().toUpperCase();
      if (!category) {
        return rejectBarcode("Unable to validate this item's category.");
      }

      if (selectedMetal === "Silver" && category !== "S") {
        return rejectBarcode("This barcode is not a Silver item.");
      }

      if (selectedMetal === "Gold" && category === "S") {
        return rejectBarcode(
          "This barcode is a Silver item. Please select Silver.",
        );
      }

      if (result.rate === undefined || result.rate === null) {
        return rejectBarcode("Rate not found for this barcode.");
      }

      let weightsMatch: boolean;

      try {
        weightsMatch = await checkBarcodeStoneWeight(normalizedBarcode);
      } catch (error) {
        console.error("MAIN: stone weight validation failed:", error);
        return rejectBarcode("Unable to validate stone weight.");
      }

      if (!weightsMatch) {
        return rejectBarcode("Stone weight does not match.");
      }

      const detailsResponse = await getBarcodeDetails(
        normalizedBarcode,
        shopCode,
      );

      console.log("========== FRONTEND BARCODE DEBUG ==========");

      console.log("Barcode sent:", normalizedBarcode);
      console.log("Shop code sent:", shopCode);

      console.log(
        "Complete API response:",
        JSON.stringify(detailsResponse, null, 2),
      );

      console.log("ItemDetails:", detailsResponse.ItemDetails);

      console.log("ItemDetails count:", detailsResponse.ItemDetails?.length);

      console.log("StoneDetails:", detailsResponse.StoneDetails);

      console.log("=============================================");

      const detail = detailsResponse.ItemDetails?.[0];

      if (!detail) {
        return rejectBarcode("Item details not found for this barcode.");
      }

      const stoneDetails = detailsResponse.StoneDetails ?? [];

      console.log(
        "BARCODE STONE DETAILS:",
        JSON.stringify(stoneDetails, null, 2),
      );

      setBarcode("");
      setItemDetails((currentItems) => [
        ...currentItems,
        {
          ...detail,
          stoneDetails,
          selected: true,
        },
      ]);
      setLeftValue(String(result.rate));
      if (wasScanned) {
        scannedBarcodesRef.current.add(normalizedBarcode);
        try {
          await scanSuccessPlayer.seekTo(0);
          scanSuccessPlayer.play();
        } catch (error) {
          console.warn("MAIN: scan sound playback failed:", error);
        }
      }
      hasScannedRef.current = false;
      return true;
    } catch (error) {
      console.error("MAIN: rate fetch failed:", error);

      Alert.alert(
        "Rate Fetch Error",
        error instanceof Error ? error.message : String(error),
      );

      return rejectBarcode("Unable to fetch rate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    const scannedBarcode = normalizeBarcode(result.data);
    if (
      !scannedBarcode ||
      scannedBarcodesRef.current.has(scannedBarcode) ||
      hasScannedRef.current
    ) {
      return;
    }

    hasScannedRef.current = true;
    setBarcode(scannedBarcode);
    try {
      await handleAdd(scannedBarcode, true);
    } finally {
      hasScannedRef.current = false;
    }
  };

  const handleRemoveItem = useCallback((index: number) => {
    setItemIndexToRemove(index);
    setIsDeleteConfirmationVisible(true);
  }, []);

  const handleRowPress = useCallback(
    (index: number) => {
      const now = Date.now();
      const previousTap = lastRowTapRef.current;

      if (previousTap.index === index && now - previousTap.tappedAt <= 350) {
        lastRowTapRef.current = { index: -1, tappedAt: 0 };
        handleRemoveItem(index);
        return;
      }

      lastRowTapRef.current = { index, tappedAt: now };
    },
    [handleRemoveItem],
  );

  const handleToggleItem = (index: number) => {
    setItemDetails((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const handleConfirmRemoveItem = () => {
    if (itemIndexToRemove !== null) {
      setItemDetails((currentItems) =>
        currentItems.filter((_, index) => index !== itemIndexToRemove),
      );
      if (itemDetails.length === 1) {
        setLeftValue("");
      }
    }
    setItemIndexToRemove(null);
    setErrorMessage("");
    setIsDeleteConfirmationVisible(false);
  };

  const handleEstimate = () => {
    if (itemDetails.length === 0) {
      setNotice({
        title: "No Items",
        message: "Please add at least one item.",
      });
      return;
    }

    if (selectedItems.length === 0) {
      setNotice({
        title: "No Selected Items",
        message: "Please select at least one item.",
      });
      return;
    }

    setIsCustomerDetailsVisible(true);
  };

  const handleSalesmanPress = async () => {
    try {
      const shopCode = await getShopCode();

      if (!shopCode) {
        Alert.alert(
          "Error",
          "Shop code not found. Please select your shop again.",
        );
        return;
      }

      const result = await getSalesmen();

      setSalesmen(result);
      setIsSalesmanVisible(true);
    } catch (error) {
      console.error("Failed to fetch salesmen:", error);

      Alert.alert(
        "Salesman Error",
        error instanceof Error
          ? error.message
          : "Unable to load salesman list.",
      );
    }
  };

  const handleCareOfPress = async () => {
    try {
      const result = await getCareOfs();

      setCareOfs(result);
      setCareOfSearch("");
      setIsCareOfVisible(true);
    } catch (error) {
      console.error("Failed to fetch care-of list:", error);

      Alert.alert(
        "Care-Of Error",
        error instanceof Error ? error.message : "Unable to load care-of list.",
      );
    }
  };

  const handleCustomerDetailsContinue = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    const customerIdError = getCustomerIdValidationError(customerDetails);
    if (customerIdError) {
      setNotice({
        title: "Invalid Customer Details",
        message: customerIdError,
      });
      return;
    }

    const requiredFields = [
      { label: "Name", value: customerDetails.name },
      { label: "Phone Number", value: customerDetails.phoneNumber },
      { label: "Address", value: customerDetails.add1 },
      { label: "Place", value: customerDetails.place },
      { label: "Care Of", value: customerDetails.careOf },
      { label: "Salesman", value: customerDetails.salesman },
    ];
    const missingField = requiredFields.find(({ value }) => !value.trim());

    if (missingField) {
      setNotice({
        title: "Required Details",
        message: `${missingField.label} is required. Please fill it in to continue.`,
      });
      return;
    }

    if (selectedItems.length === 0) {
      setNotice({
        title: "No Selected Items",
        message: "Please select at least one item.",
      });
      return;
    }

    // Validate that the database date has loaded.
    if (!rightValue.trim()) {
      Alert.alert(
        "Date Not Available",
        "Unable to fetch the database date. Please try again.",
      );
      return;
    }

    isSubmittingRef.current = true;

    try {
      setIsSubmitting(true);

      const baseUrl = await getBaseUrl();
      const shopCode = await getShopCode();

      if (!baseUrl) {
        throw new Error(
          "Branch API URL not found. Please select your shop again.",
        );
      }

      if (!shopCode) {
        throw new Error("Shop code not found. Please select your shop again.");
      }

      setApiBaseUrl(baseUrl);

      const username = await getUsername();
      const password = await getPassword();

      const goldSilverRates = await getGoldSilverRates();

      console.log("GOLD AND SILVER RATES:", goldSilverRates);

      // Determine the estimate metal type and rate.
      const goldSlv = selectedMetal === "Silver" ? "S" : "G";

      const estimateRate =
        selectedMetal === "Silver"
          ? Number(goldSilverRates.slvrate)
          : Number(leftValue) || 0;

      // Do not save a Silver estimate without a valid Silver rate.
      if (
        selectedMetal === "Silver" &&
        (!Number.isFinite(estimateRate) || estimateRate <= 0)
      ) {
        throw new Error(
          "Silver rate is missing or invalid. Please check the latest Silver rate.",
        );
      }

      if (!username || !password) {
        throw new Error(
          "Username or password not found. Please select your shop again.",
        );
      }
      // Step 1: Get existing device UUID from local storage
      const deviceId = await getDeviceId();

      if (!deviceId) {
        throw new Error("Device UUID not found in local storage.");
      }

      // Step 2: Retrieve numeric devices.id from backend
      const deviceDatabaseId = await getDeviceDatabaseId(deviceId);

      if (!Number.isInteger(deviceDatabaseId) || deviceDatabaseId <= 0) {
        throw new Error("Invalid device database ID.");
      }

      console.log("DEVICE UUID:", deviceId);
      console.log("DEVICE DATABASE ID:", deviceDatabaseId);
      let custId = customerDetails.custId.trim();

      if (!custId) {
        const mobile = customerDetails.phoneNumber.trim();

        // Check again immediately before creating the customer.
        const existingCustomer = await getCrmCustomerByMobile(mobile);

        custId =
          existingCustomer?.custid ??
          existingCustomer?.custId ??
          existingCustomer?.code ??
          "";

        if (!custId) {
          const crmResponse = await createCrmCustomer(
            {
              name: customerDetails.name.trim(),
              add1: customerDetails.add1.trim(),
              add2: customerDetails.add2.trim(),
              add3: customerDetails.place.trim(),
              mob: mobile,
              place: customerDetails.place.trim(),
              pan: customerDetails.panNo.trim(),
              gstin: customerDetails.gstNo.trim(),
              pincode: customerDetails.pincode.trim(),
              smanname: customerDetails.salesman.trim(),
              aadharno: customerDetails.aadhar.trim(),
              username,
              shopcode: shopCode,
              todaydate: formatDateForApi(rightValue),
              conPerson: customerDetails.name.trim(),
            },
            shopCode,
            username,
            password,
          );

          custId = crmResponse.custid?.trim() ?? "";
        }

        if (!custId) {
          throw new Error(
            "CRM customer creation did not return a customer ID. The sales entry was not submitted.",
          );
        }

        setCustomerDetails((current) => ({
          ...current,
          custId,
        }));
      } else {
        // Customer already exists, update details via PUT /customer/update/{crmid}
        try {
          const updateId = customerDetails.crmid || custId;
          await updateCrmCustomer(
            updateId,
            {
              name: customerDetails.name.trim(),
              add1: customerDetails.add1.trim(),
              add2: customerDetails.add2.trim(),
              add3: customerDetails.place.trim(),
              mob: customerDetails.phoneNumber.trim(),
              place: customerDetails.place.trim(),
              pan: customerDetails.panNo.trim(),
              gstin: customerDetails.gstNo.trim(),
              pincode: customerDetails.pincode.trim(),
              smanname: customerDetails.salesman.trim(),
              aadharno: customerDetails.aadhar.trim(),
              conPerson:
                customerDetails.careOf.trim() || customerDetails.name.trim(),
            },
            shopCode,
            username,
            password,
          );
        } catch (updateError) {
          console.warn("[CRM] Customer update error (non-fatal):", updateError);
        }
      }

      const payload = {
        general: {
          estDte: formatDateForApi(rightValue),

          userid: deviceDatabaseId,
          custid: custId,

          estCunm: customerDetails.name,
          estPhone: customerDetails.phoneNumber,

          aadharno: customerDetails.aadhar,
          gstno: customerDetails.gstNo,
          panno: customerDetails.panNo,

          careoff: customerDetails.careOf,

          estAdd1: customerDetails.add1,
          estAdd2: customerDetails.add2,
          estAdd3: customerDetails.place,
          estPin: customerDetails.pincode,

          // Salesman details
          estSman1: customerDetails.salesman,
          estSman2: customerDetails.salesman,

          // Metal type
          goldSlv: goldSlv,

          estTamt: itemTotals.taxableAmount,

          estGstper:
            selectedItems.length > 0
              ? Number(selectedItems[0].gstPercent) || 0
              : 0,
          estIgstper: 0,
          estOthtaxper: 0,

          estDiscount: 0,
          prevAmt: 0,

          estyear: new Date().getFullYear(),

          shopcode: shopCode,

          estGrate: estimateRate,

          grate22: goldSilverRates.grate22,
          grate18: goldSilverRates.grate18,
          slvrate: goldSilverRates.slvrate,
        },

        sales: {
          barflag: false,

          sMan: customerDetails.salesman,

          saleItems: selectedItems.map((item, index) => ({
            slno: index + 1,
            itSlno: index + 1,

            estBarcode: item.barcode ?? "",
            estIcode: item.itemCode ?? "",
            estItdesc: item.itemName ?? "",
            estCntr: item.itemCounter ?? "",

            // Quantity and weight details
            estQty: Number(item.quantity) || 0,
            estNoded: 0,
            estWt: Number(item.grossWeight) || 0,
            estStnwt: Number(item.stoneWeight) || 0,
            estActualwt: Number(item.actualWeight) || 0,
            estNtwt: Number(item.netWeight) || 0,

            // Amount details
            estVaper: Number(item.vaPercent) || 0,
            estVamt: Number(item.vaAmount) || 0,
            estStnch: Number(item.stoneCharge) || 0,
            estRate: Number(item.rate) || 0,
            estGamt: Number(item.metalAmount) || 0,
            estTamt: Number(item.taxableAmount) || 0,
            estGstper: Number(item.gstPercent) || 0,
            estGstamt: Number(item.gstAmount) || 0,
            totalamount: Number(item.netAmount) || 0,

            // Start the adjustable VA values at the original VA values.
            afterva: Number(item.vaPercent) || 0,
            aftervaamt: Number(item.vaAmount) || 0,
            huid: "",
            billtime: null,

            // Salesman
            estSman: customerDetails.salesman,
            estSman1: customerDetails.salesman,
          })),
        },

        stones: {
          stoneEntries: selectedItems.flatMap((item, itemIndex) =>
            (item.stoneDetails ?? []).map((stone, stoneIndex) => ({
              slno: stoneIndex + 1,

              itSlno: itemIndex + 1,

              barcode: item.barcode ?? "",

              stnTyp: stone.stoneCode ?? "",

              stnNos: Number(stone.qty) || 0,
              stnQty: Number(stone.wt) || 0,
              stnRate: Number(stone.rate) || 0,
              stnAmt: Number(stone.amount) || 0,

              aftStnrate: Number(stone.rate) || 0,
              aftStnamt: Number(stone.amount) || 0,

              stype: stone.sType ?? stone.stoneCode ?? "",
            })),
          ),
        },
      };

      console.log(
        "CREATE SALES ENTRY PAYLOAD:",
        JSON.stringify(payload, null, 2),
      );

      const estimateNo = await createSalesEntry(payload, shopCode);

      console.log("Created estimate number:", estimateNo);

      const receiptData = {
        estimateNo,
        estimateDate: rightValue,
        rate: leftValue,
        shopCode,
        customer: {
          name: customerDetails.name,
          addressLine1: customerDetails.add1,
          addressLine2: customerDetails.add2,
          place: customerDetails.place,
          phoneNumber: customerDetails.phoneNumber,
          salesman: customerDetails.salesman,
        },
        items: selectedItems,
      };

      setBarcode("");
      setItemDetails([]);
      setLeftValue("");
      // setRightValue(formatDateForDisplay(new Date()));
      // Keep the database date already loaded in rightValue.
      setCustomerDetails({
        phoneNumber: "",
        custId: "",
        crmid: "",
        name: "",
        aadhar: "",
        gstNo: "",
        panNo: "",
        careOf: "",
        add1: "",
        add2: "",
        place: "",
        pincode: "",
        salesman: "",
      });
      setErrorMessage("");
      setNotice(null);
      setIsCustomerDetailsVisible(false);

      try {
        const receipt = formatEstimateReceipt(receiptData);
        const receiptHeight = Math.ceil(receipt.split("\n").length * 9 + 12);
        await Print.printAsync({
          html: estimateReceiptToHtml(receipt),
          width: 164,
          height: receiptHeight,
        });
      } catch (error) {
        console.error("Print estimate failed:", error);
        Alert.alert(
          "Print Error",
          error instanceof Error
            ? error.message
            : "Estimate saved, but unable to print receipt.",
        );
      }
    } catch (error) {
      console.error("Create sales entry failed:", error);

      Alert.alert(
        "Save Error",
        error instanceof Error ? error.message : "Unable to save estimate.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          {/* Left container with Hamburger Menu Button (width: 100 balances the 100px picker on right) */}
          <View style={styles.headerLeftContainer}>
            <HamburgerButton onPress={() => setIsDrawerOpen(true)} />
          </View>

          {/* Centered ESTIMATE title */}
          <Text style={styles.title}>ESTIMATE</Text>

          {/* Gold / Silver Dropdown positioned on the right, above the Date field */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Metal type: ${selectedMetal}`}
            accessibilityHint="Opens the metal type menu"
            accessibilityState={{
              disabled: itemDetails.length > 0 || isSubmitting,
            }}
            onPress={() => setIsMetalMenuVisible(true)}
            disabled={itemDetails.length > 0 || isSubmitting}
            style={({ pressed }) => [
              styles.metalPickerContainer,
              (itemDetails.length > 0 || isSubmitting) &&
                styles.metalPickerDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.metalPickerText}>{selectedMetal}</Text>
            <Text style={styles.metalPickerChevron}>▼</Text>
          </Pressable>
        </View>

        <View style={styles.barcodeSection}>
          <View style={styles.topFieldsRow}>
            <TextInput
              value={leftValue ? `₹ ${leftValue}` : ""}
              onChangeText={setLeftValue}
              placeholder="Rate"
              textAlign="center"
              placeholderTextColor="#8A93A6"
              style={styles.topInput1}
              editable={false}
            />

            <TextInput
              value={rightValue}
              placeholder="Date"
              textAlign="center"
              placeholderTextColor="#8A93A6"
              style={styles.topInput}
              editable={false}
            />
          </View>

          <View style={styles.barcodeRow}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={barcodeInputRef}
                value={barcode}
                onChangeText={(value) => {
                  setBarcode(value.toUpperCase());
                  setErrorMessage("");
                }}
                onBlur={handleBarcodeBlur}
                placeholder="Enter or scan barcode"
                placeholderTextColor="#8A93A6"
                editable={!isSubmitting}
                autoFocus
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                returnKeyType="done"
              />

              <Pressable
                style={({ pressed }) => [
                  styles.scanInsideButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleScan}
                disabled={isSubmitting}
              >
                <Text style={styles.scanText}>Scan</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={() => void handleAdd()}
              disabled={isSubmitting}
            >
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.tableContainer}>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContent}>
              {/* HEADER */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colBarcode]}>
                  Barcode
                </Text>

                <Text style={[styles.tableHeaderText, styles.colItemCode]}>
                  Item Code
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colWeight,
                  ]}
                >
                  Gross.Wt
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colWeight,
                  ]}
                >
                  Stone.Wt
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colWeight,
                  ]}
                >
                  Net.Wt
                </Text>

                <Text style={[styles.tableHeaderText, styles.colAmount]}>
                  Rate
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  Metal.Amt
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  VA%
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  VA.Amt
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  Stone.Chg
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  Amount
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  Gst.Amt
                </Text>

                <Text
                  style={[
                    styles.tableHeaderText,
                    styles.tableNumericCell,
                    styles.colAmount,
                  ]}
                >
                  Total.Amt
                </Text>

                <Text style={[styles.tableHeaderText, styles.colAction]}>
                  Select
                </Text>
              </View>

              {/* ROWS */}
              <FlatList
                style={styles.tableVerticalScroll}
                data={tableItems}
                keyExtractor={(item, index) =>
                  item?.barcode ?? `empty-${index}`
                }
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews
                renderItem={({ item: itemDetail, index }) => (
                  <Pressable
                    onPress={() => itemDetail && handleRowPress(index)}
                    style={({ pressed }) => [
                      styles.tableRow,
                      pressed && itemDetail && styles.tableRowPressed,
                    ]}
                  >
                    <Text style={[styles.tableCell, styles.colBarcode]}>
                      {itemDetail?.barcode ?? "-"}
                    </Text>
                    <Text style={[styles.tableCell, styles.colItemCode]}>
                      {itemDetail?.itemCode ?? "-"}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colWeight,
                      ]}
                    >
                      {formatWeight(itemDetail?.grossWeight)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colWeight,
                      ]}
                    >
                      {formatWeight(itemDetail?.stoneWeight)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colWeight,
                      ]}
                    >
                      {formatWeight(itemDetail?.netWeight)}
                    </Text>

                    <Text style={[styles.tableCell, styles.colAmount]}>
                      {itemDetail?.rate ?? "-"}
                    </Text>

                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.metalAmount)}
                    </Text>

                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.vaPercent)}
                    </Text>

                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.vaAmount)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.stoneCharge)}
                    </Text>

                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.taxableAmount)}
                    </Text>

                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.gstAmount)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableNumericCell,
                        styles.colAmount,
                      ]}
                    >
                      {formatAmount(itemDetail?.netAmount)}
                    </Text>
                    <View style={styles.colAction}>
                      {itemDetail ? (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityLabel={`Select ${itemDetail.barcode ?? "item"}`}
                          accessibilityState={{ checked: itemDetail.selected }}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleToggleItem(index);
                          }}
                          style={[
                            styles.checkbox,
                            itemDetail.selected && styles.checkboxChecked,
                          ]}
                        >
                          <Text style={styles.checkboxText}>
                            {itemDetail.selected ? "✓" : ""}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </Pressable>
                )}
              />
            </View>
          </ScrollView>
        </View>
        <View style={styles.bottomActionRow}>
          <View style={styles.totalAmount}>
            <Text style={styles.totalAmountLabel}>Amount</Text>
            <Text style={styles.totalAmountValue}>
              {formatAmount(itemTotals.taxableAmount)}
            </Text>
          </View>
          <View style={styles.totalAmount}>
            <Text style={styles.totalAmountLabel}>GST</Text>
            <Text style={styles.totalAmountValue}>
              {formatAmount(itemTotals.gstAmount)}
            </Text>
          </View>

          <View style={styles.totalAmount}>
            <Text style={styles.totalAmountLabel}>Total.Amt</Text>
            <Text style={styles.totalAmountValue}>
              {formatAmount(itemTotals.netAmount)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleEstimate}
            style={({ pressed }) => [
              styles.estimateButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.estimateButtonText}>Estimate</Text>
          </Pressable>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>@Blogtec Software LLP</Text>
        </View>
      </View>
      <Modal
        transparent
        visible={isCustomerDetailsVisible}
        animationType="fade"
        onRequestClose={() => setIsCustomerDetailsVisible(false)}
      >
        <View style={styles.customerPopupBackdrop}>
          <View style={styles.customerDetailsCard}>
            <Text style={styles.customerDetailsTitle}>Customer Details</Text>
            <ScrollView
              style={styles.customerFieldsScroll}
              contentContainerStyle={styles.customerFieldsContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.customerFieldsGrid}>
                {renderCustomerField("phoneNumber", "Phone Number")}
                {renderCustomerField("custId", "Customer ID")}
                {renderCustomerField("name", "Name")}
                {renderCustomerField("aadhar", "Aadhaar")}
                {renderCustomerField("gstNo", "GST No")}
                {renderCustomerField("panNo", "PAN No")}
                <View style={styles.customerSelectorRow}>
                  {renderSalesmanField()}
                  {renderCareOfField()}
                </View>
                {renderCustomerField("add1", "Address", true)}
                {renderCustomerField("add2", "Address 2", true)}
                {renderCustomerField("place", "Place")}
                {renderCustomerField("pincode", "Pincode")}
              </View>
            </ScrollView>
            <View style={styles.customerDetailsActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsCustomerDetailsVisible(false)}
                style={({ pressed }) => [
                  styles.customerCancelButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.customerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleCustomerDetailsContinue}
                style={({ pressed }) => [
                  styles.customerContinueButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.customerContinueText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isCustomerListVisible}
        animationType="fade"
        onRequestClose={() => setIsCustomerListVisible(false)}
      >
        <View style={styles.salesmanPopupBackdrop}>
          <View style={styles.salesmanPopupCard}>
            <Text style={styles.salesmanPopupTitle}>Select Customer</Text>

            <View style={styles.salesmanTableHeader}>
              <Text
                style={[
                  styles.salesmanTableHeaderText,
                  styles.salesmanCodeColumn,
                ]}
              >
                Customer ID
              </Text>
              <Text
                style={[
                  styles.salesmanTableHeaderText,
                  styles.customerNameColumn,
                ]}
              >
                Name
              </Text>
              <Text
                style={[
                  styles.salesmanTableHeaderText,
                  styles.customerMobileColumn,
                ]}
              >
                Mobile
              </Text>
            </View>

            {isCustomerListLoading ? (
              <View style={styles.salesmanEmptyRow}>
                <ActivityIndicator color="#D4AF37" />
                <Text style={styles.salesmanEmptyText}>
                  Loading customers...
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.salesmanTableScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {customerList.map((customer, index) => {
                  const customerId =
                    customer.custid ?? customer.custId ?? customer.code ?? "";

                  return (
                    <Pressable
                      key={customerId || `customer-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Select customer ${customerId}`}
                      disabled={isCustomerListLoading}
                      onPress={() => void handleCustomerSelect(customerId)}
                      style={({ pressed }) => [
                        styles.salesmanTableRow,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.salesmanTableCell,
                          styles.salesmanCodeColumn,
                        ]}
                      >
                        {customer.custid ?? "-"}
                      </Text>
                      <Text
                        style={[
                          styles.salesmanTableCell,
                          styles.customerNameColumn,
                        ]}
                      >
                        {customer.name ?? "-"}
                      </Text>
                      <Text
                        style={[
                          styles.salesmanTableCell,
                          styles.customerMobileColumn,
                        ]}
                      >
                        {customer.mob ?? "-"}
                      </Text>
                    </Pressable>
                  );
                })}

                {customerList.length === 0 && (
                  <View style={styles.salesmanEmptyRow}>
                    <Text style={styles.salesmanEmptyText}>
                      No customers found
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {customerTotalPages !== null && customerTotalPages > 1 && (
              <View style={styles.customerPaginationControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous customer page"
                  disabled={customerPageNumber <= 1 || isCustomerListLoading}
                  onPress={() =>
                    void handleCustomerListPress(customerPageNumber - 1)
                  }
                  style={({ pressed }) => [
                    styles.customerPageButton,
                    (customerPageNumber <= 1 || isCustomerListLoading) &&
                      styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.customerPageButtonText}>‹</Text>
                </Pressable>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.customerPageNumbers}
                >
                  {visibleCustomerPages.map((pageNumber) => (
                    <Pressable
                      key={pageNumber}
                      accessibilityRole="button"
                      accessibilityLabel={`Customer page ${pageNumber}`}
                      accessibilityState={{
                        selected: pageNumber === customerPageNumber,
                        disabled: isCustomerListLoading,
                      }}
                      disabled={isCustomerListLoading}
                      onPress={() => void handleCustomerListPress(pageNumber)}
                      style={({ pressed }) => [
                        styles.customerPageButton,
                        pageNumber === customerPageNumber &&
                          styles.customerPageButtonSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.customerPageButtonText,
                          pageNumber === customerPageNumber &&
                            styles.customerPageButtonTextSelected,
                        ]}
                      >
                        {pageNumber}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next customer page"
                  disabled={
                    customerPageNumber >= customerTotalPages ||
                    isCustomerListLoading
                  }
                  onPress={() =>
                    void handleCustomerListPress(customerPageNumber + 1)
                  }
                  style={({ pressed }) => [
                    styles.customerPageButton,
                    (customerPageNumber >= customerTotalPages ||
                      isCustomerListLoading) &&
                      styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.customerPageButtonText}>›</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCustomerListVisible(false)}
              style={({ pressed }) => [
                styles.salesmanCloseButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.salesmanCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isSalesmanVisible}
        animationType="fade"
        onRequestClose={() => setIsSalesmanVisible(false)}
      >
        <View style={styles.salesmanPopupBackdrop}>
          <View style={styles.salesmanPopupCard}>
            <Text style={styles.salesmanPopupTitle}>Select Salesman</Text>

            <FlatList
              style={styles.salesmanTableScroll}
              data={salesmen}
              keyExtractor={(salesman, index) =>
                salesman.code ?? `salesman-${index}`
              }
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
              ListHeaderComponent={
                <View style={styles.salesmanTableHeader}>
                <Text
                  style={[
                    styles.salesmanTableHeaderText,
                    styles.salesmanCodeColumn,
                  ]}
                >
                  SM Code
                </Text>

                <Text
                  style={[
                    styles.salesmanTableHeaderText,
                    styles.salesmanNameColumn,
                  ]}
                >
                  Name
                </Text>
                </View>
              }
              renderItem={({ item: salesman }) => (
                <Pressable
                  onPress={() => {
                    setCustomerDetails((current) => ({
                      ...current,
                      salesman: salesman.code ?? "",
                    }));

                    setIsSalesmanVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.salesmanTableRow,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.salesmanTableCell,
                      styles.salesmanCodeColumn,
                    ]}
                  >
                    {salesman.code ?? "-"}
                  </Text>

                  <Text
                    style={[
                      styles.salesmanTableCell,
                      styles.salesmanNameColumn,
                    ]}
                  >
                    {salesman.name ?? "-"}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.salesmanEmptyRow}>
                  <Text style={styles.salesmanEmptyText}>
                    No salesmen found.
                  </Text>
                </View>
              }
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsSalesmanVisible(false)}
              style={({ pressed }) => [
                styles.salesmanCloseButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.salesmanCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isCareOfVisible}
        animationType="fade"
        onRequestClose={() => setIsCareOfVisible(false)}
      >
        <View style={styles.salesmanPopupBackdrop}>
          <View style={styles.salesmanPopupCard}>
            <Text style={styles.salesmanPopupTitle}>Care-Of Lookup</Text>

            <TextInput
              value={careOfSearch}
              onChangeText={setCareOfSearch}
              placeholder="Search by name..."
              placeholderTextColor="#8A93A6"
              style={styles.customerFieldInput}
            />

            <FlatList
              style={styles.salesmanTableScroll}
              data={filteredCareOfs}
              keyExtractor={(careOf, index) =>
                careOf.careofcode ?? `careof-${index}`
              }
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
              ListHeaderComponent={
                <View style={styles.salesmanTableHeader}>
                <Text
                  style={[
                    styles.salesmanTableHeaderText,
                    styles.salesmanCodeColumn,
                  ]}
                >
                  CODE
                </Text>

                <Text
                  style={[
                    styles.salesmanTableHeaderText,
                    styles.salesmanNameColumn,
                  ]}
                >
                  NAME
                </Text>

                <Text
                  style={[
                    styles.salesmanTableHeaderText,
                    styles.salesmanNameColumn,
                  ]}
                >
                  PLACE
                </Text>
                </View>
              }
              renderItem={({ item: careOf }) => (
                  <Pressable
                    onPress={() => {
                      setCustomerDetails((current) => ({
                        ...current,
                        careOf: careOf.careofcode ?? "",
                      }));

                      setIsCareOfVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.salesmanTableRow,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.salesmanTableCell,
                        styles.salesmanCodeColumn,
                      ]}
                    >
                      {careOf.careofcode ?? "-"}
                    </Text>

                    <Text
                      style={[
                        styles.salesmanTableCell,
                        styles.salesmanNameColumn,
                      ]}
                    >
                      {careOf.careofname ?? "-"}
                    </Text>

                    <Text
                      style={[
                        styles.salesmanTableCell,
                        styles.salesmanNameColumn,
                      ]}
                    >
                      {careOf.place ?? "-"}
                    </Text>
                  </Pressable>
              )}
              ListEmptyComponent={
                careOfs.length === 0 ? (
                <View style={styles.salesmanEmptyRow}>
                  <Text style={styles.salesmanEmptyText}>
                    No care-of records found.
                  </Text>
                </View>
                ) : null
              }
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCareOfVisible(false)}
              style={({ pressed }) => [
                styles.salesmanCloseButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.salesmanCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isDeleteConfirmationVisible}
        animationType="fade"
        onRequestClose={() => setIsDeleteConfirmationVisible(false)}
      >
        <View style={styles.deleteDialogBackdrop}>
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteDialogTitle}>Delete this row?</Text>
            <Text style={styles.deleteDialogMessage}>
              Remove this item and its rate from the table?
            </Text>
            <View style={styles.deleteDialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDeleteConfirmationVisible(false)}
                style={styles.deleteCancelButton}
              >
                <Text style={styles.deleteCancelText}>No</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmRemoveItem}
                style={styles.deleteConfirmButton}
              >
                <Text style={styles.deleteConfirmText}>Yes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={notice !== null}
        animationType="fade"
        onRequestClose={() => setNotice(null)}
      >
        <View style={styles.deleteDialogBackdrop}>
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteDialogTitle}>{notice?.title}</Text>
            <Text style={styles.deleteDialogMessage}>{notice?.message}</Text>
            <View style={styles.deleteDialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setNotice(null)}
                style={styles.noticeButton}
              >
                <Text style={styles.noticeButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={isMetalMenuVisible}
        animationType="fade"
        onRequestClose={() => setIsMetalMenuVisible(false)}
      >
        <SafeAreaView style={styles.metalMenuOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close metal type menu"
            onPress={() => setIsMetalMenuVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.metalMenu}>
            {["Gold", "Silver"].map((metal) => (
              <Pressable
                key={metal}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedMetal === metal }}
                onPress={() => {
                  setSelectedMetal(metal);
                  setIsMetalMenuVisible(false);
                }}
                style={[
                  styles.metalMenuOption,
                  selectedMetal === metal && styles.metalMenuOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.metalMenuOptionText,
                    selectedMetal === metal &&
                      styles.metalMenuOptionTextSelected,
                  ]}
                >
                  {metal}
                </Text>
                {selectedMetal === metal ? (
                  <Text style={styles.metalMenuSelectedLabel}>Selected</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      <AurixDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeRoute="item-details"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121826",
  },

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

  deleteDialogBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.64)",
  },

  deleteDialog: {
    width: "100%",
    maxWidth: 360,
    padding: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#48536A",
    backgroundColor: "#1B2333",
  },

  deleteDialogTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  deleteDialogMessage: {
    marginTop: 8,
    color: "#C5CBD5",
    fontSize: 15,
    lineHeight: 22,
  },

  deleteDialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 22,
  },

  deleteCancelButton: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#667085",
    borderRadius: 6,
  },

  deleteCancelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  deleteConfirmButton: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#B8323C",
  },

  deleteConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  noticeButton: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#D4AF37",
  },

  noticeButtonText: {
    color: "#060914",
    fontSize: 14,
    fontWeight: "700",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  brand: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
  },

  headerSpacer: {
    width: 100,
  },

  headerLeftContainer: {
    width: 100,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  title: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },

  metalPickerContainer: {
    width: 100,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 8,
    backgroundColor: "#242D40",
  },

  metalPickerDisabled: {
    opacity: 0.45,
  },

  metalPickerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  metalPickerChevron: {
    color: "#D4AF37",
    fontSize: 11,
  },

  metalMenuOverlay: {
    flex: 1,
    paddingTop: 96,
    paddingHorizontal: 20,
    alignItems: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  metalMenu: {
    width: 180,
    padding: 6,
    borderWidth: 1,
    borderColor: "#48536A",
    borderRadius: 8,
    backgroundColor: "#1B2333",
    elevation: 12,
  },

  metalMenuOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: 5,
  },

  metalMenuOptionSelected: {
    backgroundColor: "#303A4F",
  },

  metalMenuOptionText: {
    color: "#E3E7ED",
    fontSize: 15,
  },

  metalMenuOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  metalMenuSelectedLabel: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
  },

  barcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  inputContainer: {
    flex: 1,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#242D40",
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    overflow: "hidden",
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },

  scanInsideButton: {
    height: "100%",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#303A4F",
  },

  scanText: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "700",
  },

  addButton: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
  },

  addButtonText: {
    color: "#060914",
    fontSize: 30,
    fontWeight: "400",
    lineHeight: 34,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  barcodeSection: {
    width: "100%",
  },

  topFieldsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  topInput: {
    width: "48%",
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: "#242D40",
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    color: "#D4AF37",
    fontSize: 16,
  },
  topInput1: {
    width: "48%",
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: "#242D40",
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    color: "#fefbf2",
    fontSize: 16,
  },

  tableContainer: {
    marginTop: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1B2333",
  },

  customerDetailsCard: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "84%",
    flexShrink: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    backgroundColor: "#1B2333",
  },

  customerPopupBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
  },

  customerDetailsTitle: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  customerFieldsScroll: {
    maxHeight: 360,
    flexShrink: 1,
  },

  customerFieldsContent: {
    paddingVertical: 4,
  },

  customerFieldsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  customerSelectorRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },

  customerField: {
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 110,
  },

  customerSelectorField: {
    flex: 1,
    minWidth: 0,
  },

  customerFieldFull: {
    flexBasis: "100%",
  },

  customerFieldNarrow: {
    flexGrow: 0,
    flexBasis: "30%",
    minWidth: 76,
  },

  customerFieldLabel: {
    marginBottom: 4,
    color: "#AAB3C5",
    fontSize: 11,
    fontWeight: "700",
  },

  customerFieldInput: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 8,
    backgroundColor: "#242D40",
    color: "#FFFFFF",
    fontSize: 14,
  },

  salesmanFieldInput: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 8,
    backgroundColor: "#242D40",
  },

  salesmanFieldText: {
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 2,
  },

  salesmanPopupBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
  },

  salesmanPopupCard: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "70%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 12,
    backgroundColor: "#1B2333",
  },

  salesmanPopupTitle: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  customerPaginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  customerPageNumbers: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 6,
  },

  customerPageButton: {
    width: 34,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#303A4F",
    borderRadius: 8,
    backgroundColor: "#242D40",
  },

  customerPageButtonSelected: {
    borderColor: "#D4AF37",
    backgroundColor: "#D4AF37",
  },

  customerPageButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  customerPageButtonTextSelected: {
    color: "#060914",
  },

  salesmanTableScroll: {
    maxHeight: 350,
  },

  salesmanTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    backgroundColor: "#242D40",
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
  },

  salesmanTableHeaderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
  },

  salesmanTableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
  },

  salesmanTableCell: {
    color: "#AAB3C5",
    fontSize: 13,
    paddingHorizontal: 10,
  },

  salesmanCodeColumn: {
    width: 120,
  },

  salesmanNameColumn: {
    flex: 1,
  },

  customerNameColumn: {
    flex: 1,
  },

  customerMobileColumn: {
    width: 120,
  },

  salesmanEmptyRow: {
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  salesmanEmptyText: {
    color: "#AAB3C5",
    fontSize: 13,
  },

  salesmanCloseButton: {
    minHeight: 44,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#667085",
    borderRadius: 8,
  },

  salesmanCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  customerDetailsActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  customerCancelButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#667085",
    borderRadius: 8,
  },

  customerCancelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  customerContinueButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#D4AF37",
  },

  customerContinueText: {
    color: "#060914",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 12,
    paddingBottom: 8,
  },

  footerText: {
    color: "#D4AF37",
    fontSize: 12,
  },

  totalAmount: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 8,

    borderColor: "#303A4F",
    borderRadius: 8,
    backgroundColor: "#242D40",
  },

  totalAmountLabel: {
    color: "#AAB3C5",
    fontSize: 11,
    fontWeight: "700",
  },

  totalAmountValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  estimateButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
  },

  estimateButtonText: {
    color: "#060914",
    fontSize: 14,
    fontWeight: "600",
  },

  tableContent: {
    flex: 1,
  },

  emptyArea: {
    height: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#AAB3C5",
  },
  tableVerticalScroll: {
    height: 420,
    maxHeight: 420,
  },

  tableTitle: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
  },

  tableScroll: {
    maxHeight: 420,
  },

  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    backgroundColor: "#242D40",
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#303A4F",
  },

  tableRowPressed: {
    opacity: 0.7,
  },

  tableHeaderText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
  },

  tableCell: {
    color: "#AAB3C5",
    fontSize: 12,
    paddingHorizontal: 10,
  },

  tableNumericCell: {
    textAlign: "right",
  },

  colBarcode: {
    width: 90,
  },

  colItemCode: {
    width: 80,
  },

  // colItemName: {
  //   width: 90,
  // },

  colWeight: {
    width: 80,
  },

  colAmount: {
    width: 80,
  },

  colAction: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#667085",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  checkboxChecked: {
    borderColor: "#D4AF37",
    backgroundColor: "#D4AF37",
  },

  checkboxText: {
    color: "#060914",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
});
