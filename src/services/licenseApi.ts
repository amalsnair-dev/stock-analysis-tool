const protocol = process.env.EXPO_PUBLIC_SOFTHUB_API_PROTOCOL ?? "http";
const host = process.env.EXPO_PUBLIC_SOFTHUB_API_HOST ?? "192.168.1.100";
const port = process.env.EXPO_PUBLIC_SOFTHUB_API_PORT ?? "8080";
const project = process.env.EXPO_PUBLIC_SOFTHUB_API_PROJECT ?? "btssofthubapi";

const SOFTHUB_BASE_URL = `${protocol}://${host}:${port}/${project}`;

export type LicenseVerifyResponse = {
  status: string;
  serialNumber?: string;
  licenseKey?: string;
  licenseNumber?: string;
  companyDbId?: number;
  companyId: string;
  companyCode?: string;
  companyName: string;
  validYear?: number;
  startDate?: string;
  expiryDate?: string;
  licenseStatus: string;
  licenseType?: string;
  softwareCode?: string;
  message?: string;
  expired: boolean;
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function verifyLicense(
  serial: string,
): Promise<LicenseVerifyResponse> {
  const url = `${SOFTHUB_BASE_URL}/api/license/verify?serial=${encodeURIComponent(serial.trim())}`;
  console.log("[LicenseAPI] Verifying serial at:", url);

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`License verification failed with HTTP ${response.status}`);
  }

  if (!text) {
    throw new Error("Empty response received from license server");
  }

  const data: LicenseVerifyResponse = JSON.parse(text);
  console.log("[LicenseAPI] Verification response:", data);
  return data;
}
