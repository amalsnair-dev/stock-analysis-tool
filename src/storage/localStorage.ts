import { normalizeBaseUrl } from "@/services/apiClient";
import type { LicenseVerifyResponse } from "@/services/licenseApi";
import * as SecureStore from "expo-secure-store";

const BASE_URL_KEY = "item-details-base-url";
const SHOP_CODE_KEY = "item-details-shop-code";
const USERNAME_KEY = "item-details-username";
const PASSWORD_KEY = "item-details-password";
const LICENSE_DATA_KEY = "aurix-license-data";
const SERIAL_NUMBER_KEY = "aurix-serial-number";
const COMPANY_ID_KEY = "aurix-company-id";
const COMPANY_NAME_KEY = "aurix-company-name";
const DEVICE_ID_KEY = "aurix-device-id";

export async function saveDeviceId(deviceId: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
}

export async function getDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

export async function saveBaseUrl(baseUrl: string): Promise<void> {
  await SecureStore.setItemAsync(BASE_URL_KEY, normalizeBaseUrl(baseUrl));
}

export async function getBaseUrl(): Promise<string | null> {
  const url = await SecureStore.getItemAsync(BASE_URL_KEY);
  return url ? normalizeBaseUrl(url) : null;
}

export async function saveShopCode(shopCode: string): Promise<void> {
  await SecureStore.setItemAsync(SHOP_CODE_KEY, shopCode);
}

export async function getShopCode(): Promise<string | null> {
  return SecureStore.getItemAsync(SHOP_CODE_KEY);
}

export async function saveUsername(username: string): Promise<void> {
  await SecureStore.setItemAsync(USERNAME_KEY, username);
}

export async function getUsername(): Promise<string | null> {
  return SecureStore.getItemAsync(USERNAME_KEY);
}

export async function savePassword(password: string): Promise<void> {
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function getPassword(): Promise<string | null> {
  return SecureStore.getItemAsync(PASSWORD_KEY);
}

// --- License & Company Local Storage ---

export async function saveLicenseData(
  data: LicenseVerifyResponse,
): Promise<void> {
  await SecureStore.setItemAsync(LICENSE_DATA_KEY, JSON.stringify(data));
}

export async function getLicenseData(): Promise<LicenseVerifyResponse | null> {
  const json = await SecureStore.getItemAsync(LICENSE_DATA_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function saveSerialNumber(serial: string): Promise<void> {
  await SecureStore.setItemAsync(SERIAL_NUMBER_KEY, serial);
}

export async function getSerialNumber(): Promise<string | null> {
  return SecureStore.getItemAsync(SERIAL_NUMBER_KEY);
}

export async function saveCompanyId(companyId: string): Promise<void> {
  await SecureStore.setItemAsync(COMPANY_ID_KEY, companyId);
}

export async function getCompanyId(): Promise<string | null> {
  return SecureStore.getItemAsync(COMPANY_ID_KEY);
}

export async function saveCompanyName(companyName: string): Promise<void> {
  await SecureStore.setItemAsync(COMPANY_NAME_KEY, companyName);
}

export async function getCompanyName(): Promise<string | null> {
  return SecureStore.getItemAsync(COMPANY_NAME_KEY);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(BASE_URL_KEY);
  await SecureStore.deleteItemAsync(SHOP_CODE_KEY);
  await SecureStore.deleteItemAsync(USERNAME_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
}

export async function clearAll(): Promise<void> {
  await clearSession();
  await SecureStore.deleteItemAsync(LICENSE_DATA_KEY);
  await SecureStore.deleteItemAsync(SERIAL_NUMBER_KEY);
  await SecureStore.deleteItemAsync(COMPANY_ID_KEY);
  await SecureStore.deleteItemAsync(COMPANY_NAME_KEY);
}
