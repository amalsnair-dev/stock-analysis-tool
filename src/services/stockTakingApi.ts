import { apiDelete, apiGet, apiPost } from "./apiClient";

import { getPassword, getUsername } from "../storage/localStorage";

export async function getNextStockSerial(): Promise<number> {
  return apiGet<number>("/api/v1/stock-taking/next-slno");
}

export type StockTakingEntry = {
  slno: number;
  date: string;
  operator: string;
  counter: string;
  item: string;
  macId: string | null;
  ip: string | null;
};

export async function insertStockTaking(
  entry: StockTakingEntry,
): Promise<void> {
  await apiPost<void>("/api/v1/stock-taking", entry);
}

export async function deleteStockTaking(slno: number): Promise<void> {
  await apiDelete(`/api/v1/stock-taking/${slno}`);
}

export async function deleteStockTakingTransaction(
  barcode: string,
): Promise<void> {
  await apiDelete(
    `/api/v1/stock-taking/transactions/${encodeURIComponent(barcode)}`,
  );
}

export type StockTakingTransactionRequest = {
  slno: number;
  barcode: string;
  macId: string | null;
  ip: string | null;
};

export type StockTakingTransactionResponse = {
  success: boolean;
  barcode: string;
  code: string;
  qty: number;
  grossWt: number;
  netWt: number;
};

export type StockTakingTransactionRow = StockTakingTransactionResponse & {
  isSold?: boolean;
};

export type StockTakingTransactionRecord = {
  slno: number | string;
  ctr: number | string;
  brcode: string | null;
  itcode: string | null;
  gwt: number | string | null;
  nwt: number | string | null;
  qty: number | string | null;
  cwt: number | string | null;
  cnos: number | string | null;
};

export type StockTakingStoneTotal = {
  barcode: string;
  cwt: number;
  cnos: number;
};

type StockTakingStoneTotalQueryRow = {
  barcode?: string;
  cwt?: number | string | null;
  cnos?: number | string | null;
};

export async function getStockTakingTransactions(
  slno: number,
): Promise<StockTakingTransactionResponse[]> {
  const username = await getUsername();
  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Username or password is missing. Please log in again.");
  }

  const sql = `
    SELECT
      t.slno,
      t.ctr,
      t.brcode,
      t.itcode,
      t.gwt,
      t.nwt,
      t.qty,
      t.cwt,
      t.cnos
    FROM stkchktrans t
    WHERE CAST(t.slno AS TEXT) = CAST(:slno AS TEXT)
    ORDER BY t.ctr
  `;

  const records = await apiPost<unknown>(
    "/api/query/execute?type=array",
    {
      sql,
      params: { slno },
    },
    { username, password },
  );

  if (!Array.isArray(records)) {
    if (records === null || typeof records !== "object") {
      throw new Error(
        `Stock transaction query returned ${records === null ? "null" : typeof records}, not an array.`,
      );
    }

    const response = records as Record<string, unknown>;
    const keys = Object.keys(response);
    const message = keys
      .filter((key) =>
        ["message", "error", "errormessage", "warningmessage"].includes(
          key.toLowerCase(),
        ),
      )
      .map((key) => response[key])
      .find((value): value is string => typeof value === "string");
    const responseShape =
      keys.length > 0 ? keys.join(", ") : "no object fields";
    const messageDetails = message
      ? message.length > 500
        ? `...${message.slice(-500)}`
        : message
      : "";

    throw new Error(
      `Stock transaction query returned an object instead of an array (fields: ${responseShape})${messageDetails ? `: ${messageDetails}` : "."}`,
    );
  }

  return records.map((record) => ({
    success: true,
    barcode: record.brcode ?? "",
    code: record.itcode ?? "",
    qty: Number(record.qty ?? 0),
    grossWt: Number(record.gwt ?? 0),
    netWt: Number(record.nwt ?? 0),
  }));
}

export async function insertStockTakingTransaction(
  request: StockTakingTransactionRequest,
): Promise<StockTakingTransactionResponse> {
  return apiPost<StockTakingTransactionResponse>(
    "/api/v1/stock-taking/transactions",
    request,
  );
}

export type StockTakingRecord = {
  slno: number;
  date: string;
  operator: string;
  counter: string;
  item: string;
  ip: string | null;
};

export async function getStockTakingRecordsForDate(
  ip: string,
  date: string,
): Promise<StockTakingRecord[]> {
  const username = await getUsername();
  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Username or password is missing. Please log in again.");
  }

  const sql = `
    SELECT
      m.slno,
      m.sdate AS date,
      m.operator,
      m.counter,
      m.itcode AS item,
      m.ip
    FROM stkchkmaster m
    WHERE m.sdate = CAST(:date AS DATE)
      AND m.ip = :ip
    ORDER BY m.slno
  `;

  let response = await apiPost<unknown>(
    "/api/query/execute?type=array",
    {
      sql,
      params: { ip, date },
    },
    { username, password },
  );

  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(response)) {
      return response as StockTakingRecord[];
    }

    if (typeof response !== "object" || response === null) {
      throw new Error(
        `Stock Taking query returned ${response === null ? "null" : typeof response}, not an array.`,
      );
    }

    const result = response as Record<string, unknown>;
    const entries = Object.entries(result);
    const message = entries
      .filter(([key]) =>
        ["message", "error", "errormessage", "warningmessage"].includes(
          key.toLowerCase(),
        ),
      )
      .map(([, value]) => value)
      .find((value): value is string => typeof value === "string")
      ?.trim();

    if (message?.toLowerCase() === "no data found") {
      return [];
    }

    if (result.success === false) {
      throw new Error(
        message || "Stock Taking query failed without an error message.",
      );
    }

    const wrapperKey = [
      "data",
      "result",
      "rows",
      "results",
      "records",
      "content",
    ].find((key) =>
      Object.keys(result).some(
        (responseKey) => responseKey.toLowerCase() === key,
      ),
    );

    if (!wrapperKey) {
      const fields = entries.map(([key]) => key).join(", ");
      throw new Error(
        `Stock Taking query returned an unexpected object (fields: ${fields || "none"})${message ? `: ${message}` : "."}`,
      );
    }

    const actualKey = Object.keys(result).find(
      (key) => key.toLowerCase() === wrapperKey,
    );
    response = actualKey ? result[actualKey] : undefined;
  }

  throw new Error("Stock Taking query response contained too many nested wrappers.");
}

export async function getSoldStockTakingBarcodes(
  barcodes: string[],
): Promise<string[]> {
  const uniqueBarcodes = [...new Set(barcodes.filter(Boolean))];
  if (uniqueBarcodes.length === 0) return [];

  const username = await getUsername();
  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Username or password is missing. Please log in again.");
  }

  const params: Record<string, string> = {};
  const placeholders = uniqueBarcodes
    .map((barcode, index) => {
      const name = `barcode${index}`;
      params[name] = barcode;
      return `:${name}`;
    })
    .join(", ");

  const sql = `
    SELECT m.barcode
    FROM mainstock m
    WHERE m.barcode IN (${placeholders})
      AND m.itemsold = TRUE
  `;

  const records = await apiPost<unknown>(
    "/api/query/execute?type=array",
    { sql, params },
    { username, password },
  );

  if (!Array.isArray(records)) {
    throw new Error("Sold barcode query did not return an array.");
  }

  return records.map((record) => String(record.barcode ?? "")).filter(Boolean);
}

export async function getStockTakingStoneTotals(
  barcodes: string[],
): Promise<StockTakingStoneTotal[]> {
  const uniqueBarcodes = [
    ...new Set(barcodes.map((b) => b.trim()).filter(Boolean)),
  ];
  if (uniqueBarcodes.length === 0) return [];

  const username = await getUsername();
  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Username or password is missing. Please log in again.");
  }

  const params: Record<string, string> = {};
  const placeholders = uniqueBarcodes
    .map((barcode, index) => {
      const name = `barcode${index}`;
      params[name] = barcode;
      return `:${name}`;
    })
    .join(", ");

  const sql = `
    SELECT
    b.barcode,
    COALESCE(
        SUM(CASE
            WHEN b.stonetype = 'D' THEN b.stonewt
            ELSE 0
        END), 0
    ) AS cwt,
    COALESCE(
        SUM(CASE
            WHEN b.stonetype = 'D' THEN b.nos
            ELSE 0
        END), 0
    ) AS cnos
FROM barcodeandstone b
WHERE b.barcode IN (${placeholders})
GROUP BY b.barcode
  `;

  // const sql = `
  //   SELECT
  //     b.barcode,
  //     COALESCE(SUM(b.stonewt), 0) AS cwt,
  //     COALESCE(SUM(b.nos), 0) AS cnos
  //   FROM barcodeandstone b
  //   WHERE b.barcode IN (${placeholders})
  //   GROUP BY b.barcode
  // `;

  const records = await apiPost<StockTakingStoneTotalQueryRow[]>(
    "/api/query/execute?type=array",
    { sql, params },
    { username, password },
  );

  return (records ?? []).map((record) => ({
    barcode: String(record.barcode ?? ""),
    cwt: Number(record.cwt ?? 0),
    cnos: Number(record.cnos ?? 0),
  }));
}

export type DeviceRegistrationRequest = {
  deviceName: string;
  deviceModel: string;
  osVersion: string;
};

export type DeviceRegistrationResponse = {
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  osVersion: string;
  date: string;
};

export async function registerDevice(
  request: DeviceRegistrationRequest,
): Promise<DeviceRegistrationResponse> {
  return apiPost<DeviceRegistrationResponse>("/api/devices", request);
}
