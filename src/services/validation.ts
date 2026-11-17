export const isValidPan = (pan: string): boolean => /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan.trim());

export const isValidGstin = (gstin: string): boolean => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/i.test(gstin.trim());

export const isValidAadhar = (aadhar: string): boolean => /^\d{12}$/.test(aadhar.trim());

export const getCustomerIdValidationError = (fields: {
  aadhar?: string;
  panNo?: string;
  gstNo?: string;
}): string | null => {
  const aadhar = fields.aadhar?.trim() ?? "";
  const panNo = fields.panNo?.trim() ?? "";
  const gstNo = fields.gstNo?.trim() ?? "";

  if (aadhar && !/^\d{12}$/.test(aadhar)) {
    return "Aadhaar must contain exactly 12 digits.";
  }
  if (panNo && panNo.length !== 10) {
    return "PAN No must contain exactly 10 characters.";
  }
  if (gstNo && !/^[A-Z0-9]{15}$/i.test(gstNo)) {
    return "GST No must contain exactly 15 letters or numbers.";
  }

  return null;
};

/**
 * Returns true if the barcode string looks like a valid stock barcode.
 * Accepts:
 *  - 9 digits + optional 1 uppercase letter  (e.g. 000123456A)
 *  - 10 digits                               (e.g. 0001234567)
 *  - Any other non-empty alphanumeric string (scanned barcodes may vary)
 */
export const isValidStockBarcode = (barcode: string): boolean => {
  const trimmed = barcode.trim().toUpperCase();
  if (!trimmed) return false;
  // Must contain at least one alphanumeric character
  return /^[A-Z0-9]+$/.test(trimmed);
};

/**
 * Given a raw Error thrown by apiPost, extracts a clean, user-friendly message.
 * Strips HTTP status codes and raw JSON from the message.
 */
export const parseFriendlyApiError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (!(error instanceof Error)) return fallback;

  const raw = error.message;

  // Pattern: "API request failed: 400 - <body>"
  const apiFailMatch = raw.match(/^API request failed:\s*\d+(?:\s*-\s*(.+))?$/s);
  if (apiFailMatch) {
    const body = apiFailMatch[1]?.trim();
    if (body) {
      // Try to extract a message field from JSON body
      try {
        const parsed = JSON.parse(body);
        const msg =
          parsed?.message?.trim() ||
          parsed?.error?.trim() ||
          parsed?.detail?.trim() ||
          parsed?.msg?.trim();
        if (msg) return msg;
      } catch {
        // Not JSON — return body directly if it's short and readable
        if (body.length <= 200 && !body.startsWith("{") && !body.startsWith("[")) {
          return body;
        }
      }
    }
    return fallback;
  }

  // Return the raw message if it's already a clean string
  if (raw.length <= 200) return raw;

  return fallback;
};

/**
 * Validate the CRM payload before sending it to the server.
 * Only checks essential mandatory fields (name, mob, username, shopcode, todaydate).
 * Optional fields like pan, gstin, and aadharno are not required.
 */
export const validateCrmPayload = (payload: {
  name: string;
  add1?: string;
  add2?: string;
  add3?: string;
  mob: string;
  place?: string;
  pan?: string;
  gstin?: string;
  pincode?: string;
  smanname?: string;
  aadharno?: string;
  username: string;
  shopcode: string;
  todaydate: string;
  conPerson?: string;
}): void => {
  console.log('[CRM] Validating required payload fields');

  const requiredFields: Record<string, string | undefined> = {
    name: payload.name,
    add1: payload.add1,
    place: payload.place,
    mob: payload.mob,
    username: payload.username,
    shopcode: payload.shopcode,
    todaydate: payload.todaydate,
  };

  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value || !value.trim()) {
      throw new Error(`${key} is required and cannot be empty.`);
    }
  }
};
