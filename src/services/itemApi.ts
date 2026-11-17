import { getPassword, getUsername } from "@/storage/localStorage";

import { apiGet, apiPost, apiPut, getApiBaseUrl } from "./apiClient";

import { validateCrmPayload } from "./validation";

export type BarcodeItemDetail = {
  barcode?: string;

  stockSlno?: number | string;

  date?: string;

  itemCode?: string;

  itemName?: string;

  itemCounter?: string;

  grossWeight?: number | string;

  actualWeight?: number | string;

  stoneWeight?: number | string;

  netWeight?: number | string;

  quantity?: number | string;

  goldRate?: number | string;

  purity?: number | string;

  billType?: string;

  pieceRate?: number | string;

  unit?: string;

  partyName?: string;

  designCode?: string;

  designMasterCode?: string;

  designDescription?: string;

  vaPercent?: number | string;

  vaAmount?: number | string;

  stoneCharge?: number | string;

  metalAmount?: number | string;

  taxableAmount?: number | string;

  gstAmount?: number | string;

  netAmount?: number | string;

  rate?: number | string;

  taxPercent?: number | string;
};

export type BarcodeStoneDetail = {
  slno?: number;

  stoneCode?: string;
  stoneName?: string;

  caratWeight?: number | string;
  qty?: number | string;
  wt?: number | string;

  rate?: number | string;
  amount?: number | string;

  sUnit?: string;
  sType?: string;
  sDtype?: string;
};

type RawBarcodeStone = {
  slno?: number;
  stonecode?: string;
  stonename?: string;
  stonerate?: number | string;
  stno?: number | string;
  grmwt?: number | string;
  crwt?: number | string;
  stonevalue?: number | string;
};

type RawBarcodeDetailsResponse = {
  ItemDetails?: BarcodeItemDetail[];
  StoneDetails?: RawBarcodeStone[];
};

export type BarcodeDetailsResponse = {
  ItemDetails?: BarcodeItemDetail[];
  StoneDetails?: BarcodeStoneDetail[];
};

export type ItemRateResponse = {
  barcode?: string;

  sold?: boolean;

  category?: string;

  rate?: number;
};

export type CrmCustomerResponse = {
  crmid?: string | number;

  custid?: string;

  custId?: string;

  code?: string;

  name?: string;

  mob?: string;

  add1?: string;

  add2?: string;

  add3?: string;

  place?: string;

  pincode?: string;

  aadharno?: string | number | null;

  gstin?: string | null;

  pan?: string | null;

  smanname?: string;

  salesman?: string;
};

export type CreateCrmCustomerRequest = {
  name: string;

  mob: string;

  username: string;

  shopcode: string;

  todaydate: string;

  add1?: string;

  add2?: string;

  add3?: string;

  place?: string;

  pan?: string;

  gstin?: string;

  pincode?: string;

  smanname?: string;

  aadharno?: string;

  conPerson?: string;
};

export type CreateCrmCustomerResponse = {
  crmid?: number;

  custidslno?: number;

  custid?: string;

  name?: string;

  mob?: string;

  message?: string;
};

export type SalesmanMaster = {
  code?: string;

  name?: string;
};

export type CareOfMaster = {
  careofcode?: string;

  careofname?: string;

  addr?: string;

  addr1?: string;

  place?: string;

  phoneno?: string | number;

  remark?: string;
};

export type SetSaleEstRequest = {
  estNo?: number;

  slno?: number;

  itSlno?: number;

  estBarcode?: string;

  estIcode?: string;

  estItdesc?: string;

  estCntr?: string;

  estQty?: number;

  estNoded?: number;

  estWt?: number;

  estStnwt?: number;

  estWtded?: number;

  estWtadd?: number;

  estActualwt?: number;

  estNtwt?: number;

  estMkch?: number;

  estVaper?: number;

  estWage?: number;

  estVamt?: number;

  estStnch?: number;

  estRate?: number;

  estGamt?: number;

  estTamt?: number;

  estGstper?: number;

  estIgstper?: number;

  estOthtaxper?: number;

  estGstamt?: number;

  estIgstamt?: number;

  estOthtaxamt?: number;

  totalamount?: number;

  barflag?: boolean;

  estSman?: string;

  estSman1?: string;

  afterva?: number;

  aftervaamt?: number;

  afterstnch?: number;

  huid?: string;

  billtime?: string | null;
};

export type StoneEntryRequest = {
  estNo?: number;

  itSlno?: number;

  slno?: number;

  barcode?: string;

  stype?: string;

  stnTyp?: string;

  stnNos?: number;

  stnQty?: number;

  stnRate?: number;

  stnAmt?: number;

  aftStnrate?: number;

  aftStnamt?: number;
};

export type CreateSalesEntryRequest = {
  general: {
    estDte: string;
    estGrate?: number;
    userid?: number;
    custid?: string;
    estCunm?: string;
    estAdd1?: string;
    estAdd2?: string;
    estAdd3?: string;
    estPin?: string;
    estPhone?: string;
    estSman1?: string;
    estSman2?: string;
    estOptr?: string;
    goldSlv?: string;
    barflag?: boolean;
    estGstper?: number;
    estIgstper?: number;
    estOthtaxper?: number;
    estTamt?: number;
    estDiscount?: number;
    prevAmt?: number;
    panno?: string;
    gstno?: string;
    aadharno?: string;
    careoff?: string;
    estsbillno?: number;
    estsdate?: string;
    estyear?: number;
    shopcode?: string;
    estDisrate?: number;
    grate22?: number;
    grate18?: number;
    slvrate?: number;
    purSplitflag?: boolean;
  };

  sales: {
    barflag?: boolean;

    sMan?: string;

    saleItems: SetSaleEstRequest[];
  };

  stones?: {
    estNo?: number;

    stoneEntries: StoneEntryRequest[];
  };
};

export async function getBarcodeDetails(
  barcode: string,
  shopcode: string,
): Promise<BarcodeDetailsResponse> {
  console.log("========== BARCODE API START ==========");

  const username = await getUsername();
  const password = await getPassword();

  const safeBarcode = barcode.trim();
  const safeShopcode = shopcode.trim();

  console.log("[BARCODE API] Input Parameters:", {
    barcode: safeBarcode,
    shopcode: safeShopcode,
    usernameAvailable: !!username,
    passwordAvailable: !!password,
  });

  if (!safeBarcode) {
    throw new Error("Barcode is required.");
  }

  if (!safeShopcode) {
    throw new Error("Shop code is missing.");
  }

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const endpoint = `/barcodeapi/data/${encodeURIComponent(
    safeBarcode,
  )}?shopcode=${encodeURIComponent(safeShopcode)}`;

  console.log("[BARCODE API] Endpoint:", endpoint);

  const response = await apiGet<RawBarcodeDetailsResponse>(endpoint, {
    username,
    password,
  });

  console.log("========== RAW BARCODE API RESPONSE ==========");
  console.log(JSON.stringify(response, null, 2));

  console.log("========== ITEM DETAILS ==========");
  console.log("ItemDetails Count:", response?.ItemDetails?.length);

  response?.ItemDetails?.forEach((item, index) => {
    console.log(`ITEM ${index + 1}:`, item);
    console.log("ITEM FIELD NAMES:", Object.keys(item));
  });

  console.log("========== RAW STONE DETAILS ==========");
  console.log("StoneDetails Count:", response?.StoneDetails?.length);

  response?.StoneDetails?.forEach((stone, index) => {
    console.log(`RAW STONE ${index + 1}:`, stone);
    console.log("RAW STONE FIELD NAMES:", Object.keys(stone));
  });

  // Convert backend stone property names
  // into the frontend property names.
  const normalizedStoneDetails: BarcodeStoneDetail[] = Array.isArray(
    response?.StoneDetails,
  )
    ? response.StoneDetails.map((stone) => ({
        slno: Number(stone.slno) || 1,

        stoneCode: stone.stonecode ?? "",
        stoneName: stone.stonename ?? "",

        qty: Number(stone.stno) || 0,
        wt: Number(stone.grmwt) || 0,
        caratWeight: Number(stone.crwt) || 0,

        rate: Number(stone.stonerate) || 0,
        amount: Number(stone.stonevalue) || 0,

        sType: stone.stonecode ?? "",
      }))
    : [];

  console.log("========== NORMALIZED STONE DETAILS ==========");
  console.log(JSON.stringify(normalizedStoneDetails, null, 2));

  console.log("========== BARCODE API END ==========");

  return {
    ItemDetails: Array.isArray(response?.ItemDetails)
      ? response.ItemDetails
      : [],

    StoneDetails: normalizedStoneDetails,
  };
}

export async function checkBarcodeEstimate(
  barcode: string,

  estNo: number | null,
): Promise<number | null> {
  const username = await getUsername();

  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const safeBarcode = barcode.trim();

  if (!safeBarcode) {
    throw new Error("Barcode is required.");
  }

  const sql =
    estNo === null
      ? `
            SELECT est_no
            FROM saleest
            WHERE est_barcode = :barcode
            LIMIT 1
          `
      : `
            SELECT est_no
            FROM saleest
            WHERE est_barcode = :barcode
              AND est_no <> :estNo
            LIMIT 1
          `;

  const result = await apiPost<unknown>(
    "/api/query/execute?type=object",

    {
      sql,

      params: {
        barcode: safeBarcode,

        ...(estNo === null ? {} : { estNo }),
      },
    },

    {
      username,

      password,
    },
  );

  const parseEstimateNo = (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return null;
      }

      if (value.length !== 1) {
        throw new Error("Barcode validation returned multiple estimate rows.");
      }

      return parseEstimateNo(value[0]);
    }

    if (typeof value !== "object") {
      throw new Error("Barcode validation returned an invalid response.");
    }

    const entries = Object.entries(value);

    const successEntry = entries.find(
      ([key]) => key.toLowerCase() === "success",
    );

    if (successEntry?.[1] === false) {
      const messageEntry = entries.find(([key]) =>
        [
          "warningmessage",

          "message",

          "error",

          "errormessage",

          "reason",
        ].includes(key.toLowerCase()),
      );

      const message =
        typeof messageEntry?.[1] === "string"
          ? messageEntry[1].trim().slice(0, 300)
          : "";

      if (message.toLowerCase() === "no data found") {
        return null;
      }

      const responseFields = entries.map(([key]) => key).join(", ");

      throw new Error(
        message ||
          `Barcode validation API returned success=false (response fields: ${responseFields}).`,
      );
    }

    const estimateEntry = entries.find(([key]) =>
      ["estno", "estimateno"].includes(
        key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      ),
    );

    if (estimateEntry) {
      const rawEstimateNo = estimateEntry[1];

      if (
        (typeof rawEstimateNo !== "number" &&
          typeof rawEstimateNo !== "string") ||
        (typeof rawEstimateNo === "string" && !rawEstimateNo.trim())
      ) {
        throw new Error(
          "Barcode validation returned an invalid estimate number.",
        );
      }

      const estimateNo = Number(rawEstimateNo);

      if (!Number.isFinite(estimateNo)) {
        throw new Error(
          "Barcode validation returned an invalid estimate number.",
        );
      }

      return estimateNo;
    }

    if (entries.length === 0) {
      return null;
    }

    const wrapperEntry = entries.find(([key]) =>
      ["data", "result", "rows", "results", "records", "content"].includes(
        key.toLowerCase(),
      ),
    );

    if (wrapperEntry) {
      return parseEstimateNo(wrapperEntry[1]);
    }

    throw new Error(
      `Barcode validation returned an unexpected response shape (keys: ${entries

        .map(([key]) => key)

        .join(", ")}).`,
    );
  };

  return parseEstimateNo(result);
}

export async function getItemRate(barcode: string): Promise<ItemRateResponse> {
  const username = await getUsername();

  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const safeBarcode = barcode.trim();

  if (!safeBarcode) {
    throw new Error("Barcode is required.");
  }

  const sql = `

      SELECT

        m.barcode,

        t.catg_type AS category,

        r.rate

      FROM mainstock m

      JOIN itemmaster t

        ON t.item_code = m.itemcode

      JOIN goldratemaster r

        ON r.code = t.unit

      WHERE m.barcode = :barcode

        AND m.itemsold = false

      LIMIT 1

    `;

  const requestQuery = (query: string) =>
    apiPost<ItemRateResponse>(
      "/api/query/execute?type=object",

      {
        sql: query,

        params: {
          barcode: safeBarcode,
        },
      },

      {
        username,

        password,
      },
    );

  console.log("ITEM API barcode:", safeBarcode);

  const itemRate = await requestQuery(sql);

  if (itemRate.barcode) {
    return itemRate;
  }

  const soldStatusSql = `

      SELECT

        m.barcode,

        m.itemsold AS sold

      FROM mainstock m

      WHERE m.barcode = :barcode

        AND m.itemsold = true

      LIMIT 1

    `;

  return requestQuery(soldStatusSql);
}

export async function getCrmCustomerByMobile(
  mobile: string,
): Promise<CrmCustomerResponse | null> {
  const safeMobile = mobile.trim();

  if (!safeMobile) {
    throw new Error("Mobile number is required.");
  }

  try {
    return await apiGet<CrmCustomerResponse>(
      `/customer/crmphoneno/${encodeURIComponent(safeMobile)}`,

      {},
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("API request failed: 404")
    ) {
      return null;
    }

    throw error;
  }
}

export async function getCrmCustomerById(
  custid: string,
): Promise<CrmCustomerResponse | null> {
  const safeCustId = custid.trim();

  if (!safeCustId) {
    throw new Error("Customer ID is required.");
  }

  try {
    return await apiGet<CrmCustomerResponse>(
      `/customer/find-by-custid?custid=${encodeURIComponent(safeCustId)}`,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("API request failed: 404")
    ) {
      return null;
    }

    throw error;
  }
}

export type CrmCustomerPage = {
  customers: CrmCustomerResponse[];

  totalPages: number | null;
};

function isCrmCustomer(value: unknown): value is CrmCustomerResponse {
  return (
    isRecord(value) &&
    ["custid", "custId", "code"].some(
      (key) => typeof value[key] === "string" && value[key].trim().length > 0,
    )
  );
}

export async function getAllCrmCustomers(
  pageNumber = 1,

  pageSize = 20,
): Promise<CrmCustomerPage> {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error("Page number must be a positive integer.");
  }

  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Page size must be between 1 and 100.");
  }

  try {
    const response = await apiGet<unknown>(
      `/customer/all-customers/page?page=${pageNumber - 1}&size=${pageSize}`,

      {},

      30000,
    );

    let pageData: unknown = response;

    let totalPages: number | null = null;

    let customers: unknown[] | null = null;

    for (let depth = 0; depth < 5; depth += 1) {
      if (Array.isArray(pageData)) {
        customers = pageData;

        break;
      }

      if (!isRecord(pageData)) {
        break;
      }

      const rawTotalPages = pageData.totalPages ?? pageData.total_pages;

      if (rawTotalPages !== undefined) {
        const parsedTotalPages = Number(rawTotalPages);

        if (Number.isSafeInteger(parsedTotalPages) && parsedTotalPages >= 0) {
          totalPages = parsedTotalPages;
        }
      }

      const rawTotalElements =
        pageData.totalElements ?? pageData.total_elements;

      if (totalPages === null && rawTotalElements !== undefined) {
        const totalElements = Number(rawTotalElements);

        const responsePageSize = Number(pageData.size ?? pageSize);

        if (
          Number.isSafeInteger(totalElements) &&
          totalElements >= 0 &&
          Number.isSafeInteger(responsePageSize) &&
          responsePageSize > 0
        ) {
          totalPages = Math.ceil(totalElements / responsePageSize);
        }
      }

      const customerRows =
        pageData.content ??
        pageData.customers ??
        pageData.results ??
        pageData.items;

      if (Array.isArray(customerRows)) {
        customers = customerRows;

        break;
      }

      if (
        typeof pageData.message === "string" &&
        /no crm customer found/i.test(pageData.message)
      ) {
        return { customers: [], totalPages: 0 };
      }

      const wrapper = pageData.data ?? pageData.result;

      if (wrapper === undefined) {
        break;
      }

      pageData = wrapper;
    }

    if (!customers) {
      throw new Error("Unexpected response from the customer list API.");
    }

    return {
      customers: customers.filter(isCrmCustomer),

      totalPages,
    };
  } catch (error) {
    console.error("[CRM] Failed to fetch all customers:", error);

    throw error;
  }
}

export async function createCrmCustomer(
  payload: CreateCrmCustomerRequest,

  shopcode: string,

  username: string,

  password: string,
): Promise<CreateCrmCustomerResponse> {
  const safeShopcode = shopcode.trim();

  const safeUsername = username.trim().toUpperCase();

  const safePassword = password.trim();

  if (!safeShopcode) {
    throw new Error("Shop code is missing.");
  }

  if (!safeUsername || !safePassword) {
    throw new Error("Username or password is missing.");
  }

  const requestBody = {
    name: payload.name,

    add1: payload.add1 ?? "",

    add2: payload.add2 ?? "",

    add3: payload.add3 ?? "",

    mob: payload.mob,

    place: payload.place ?? "",

    pan: payload.pan ?? "",

    gstin: payload.gstin ?? "",

    pincode: payload.pincode ?? "",

    smanname: payload.smanname ?? "",

    aadharno: payload.aadharno ?? "",

    username: safeUsername,

    shopcode: safeShopcode,

    todaydate: payload.todaydate,

    conPerson: payload.conPerson ?? payload.name,
  };

  console.log("[CRM] Sending payload:", JSON.stringify(requestBody, null, 2));

  // Validate required payload before sending to CRM

  try {
    validateCrmPayload(requestBody);
  } catch (validationError) {
    console.error("[CRM] Validation error:", validationError);

    throw validationError;
  }

  const response = await apiPost<CreateCrmCustomerResponse>(
    `/customer/create?shopcode=${encodeURIComponent(safeShopcode)}`,

    requestBody,

    {
      username: safeUsername,

      password: safePassword,
    },
  );

  console.log("[CRM] Full response:", JSON.stringify(response, null, 2));

  if (!response?.custid?.trim()) {
    console.error("[CRM] custid missing. message:", response?.message);

    throw new Error(
      response?.message?.trim() ||
        "CRM customer creation did not return a customer ID.",
    );
  }

  return response;
}

export type UpdateCrmCustomerRequest = {
  name?: string;

  mob?: string;

  add1?: string;

  add2?: string;

  add3?: string;

  place?: string;

  pan?: string;

  gstin?: string;

  pincode?: string;

  smanname?: string;

  aadharno?: string;

  conPerson?: string;

  [key: string]: unknown;
};

export async function updateCrmCustomer(
  crmid: string | number,

  payload: UpdateCrmCustomerRequest,

  shopcode: string,

  username: string,

  password: string,
): Promise<Record<string, unknown>> {
  const safeCrmid = String(crmid).trim();

  const safeShopcode = shopcode.trim();

  const safeUsername = username.trim().toUpperCase();

  const safePassword = password.trim();

  if (!safeCrmid) {
    throw new Error("Customer ID is missing for update.");
  }

  if (!safeShopcode) {
    throw new Error("Shop code is missing.");
  }

  if (!safeUsername || !safePassword) {
    throw new Error("Username or password is missing.");
  }

  console.log(`[CRM] Updating customer ${safeCrmid} with payload:`, payload);

  const response = await apiPut<Record<string, unknown>>(
    `/customer/update/${encodeURIComponent(safeCrmid)}?shopcode=${encodeURIComponent(safeShopcode)}`,

    payload,

    {
      username: safeUsername,

      password: safePassword,
    },
  );

  console.log(`[CRM] Update response for ${safeCrmid}:`, response);

  return response;
}

export async function getSalesmen(): Promise<SalesmanMaster[]> {
  return apiGet<SalesmanMaster[]>("/api/v1/salesman");
}

export type NextEstNoResponse = {
  next_est_no?: number | string;
};

// export async function getNextEstNo(): Promise<number> {

//   const username = await getUsername();

//   const password = await getPassword();

//   if (!username || !password) {

//     throw new Error("Branch API credentials are not available.");

//   }

//   const sql = `

//     SELECT COALESCE(MAX(est_no), 0) + 1 AS next_est_no

//     FROM estmstr

//   `;

//   const row = await apiPost<NextEstNoResponse>(

//     "/api/query/execute?type=object",

//     {

//       sql,

//       params: {},

//     },

//     {

//       username,

//       password,

//     },

//   );

//   const nextEstNo = Number(

//     row?.next_est_no ?? 0,

//   );

//   if (!Number.isFinite(nextEstNo) || nextEstNo <= 0) {

//     throw new Error("Unable to generate estimate number.");

//   }

//   return nextEstNo;

// }

export async function getCareOfs(
  searchText: string = "",
): Promise<CareOfMaster[]> {
  const username = await getUsername();

  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const safeSearch = searchText.trim();

  const sql = `

      SELECT

        careofcode,

        careofname,

        addr,

        addr1,

        place,

        phoneno,

        remark

      FROM careofmaster

      WHERE

        :search = ''

        OR careofname ILIKE :searchPattern

        OR careofcode ILIKE :searchPattern

      ORDER BY careofname

      LIMIT 100

    `;

  const rows = await apiPost<CareOfMaster[]>(
    "/api/query/execute?type=array",

    {
      sql,

      params: {
        search: safeSearch,

        searchPattern: `%${safeSearch}%`,
      },
    },

    {
      username,

      password,
    },
  );

  return rows ?? [];
}

export type GoldSilverRatesResponse = {
  grate22: number;

  grate18: number;

  slvrate: number;
};

type GoldSilverRatesQueryResponse = {
  grate22?: number | string;

  grate18?: number | string;

  slvrate?: number | string;
};

export async function getGoldSilverRates(): Promise<GoldSilverRatesResponse> {
  const username = await getUsername();

  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const sql = `

    SELECT

      g916 AS grate22,

      g75 AS grate18,

      slv AS slvrate

    FROM dateandrate

    ORDER BY datatime DESC

    LIMIT 1

  `;

  const row = await apiPost<GoldSilverRatesQueryResponse>(
    "/api/query/execute?type=object",

    {
      sql,

      params: {},
    },

    {
      username,

      password,
    },
  );

  if (!row) {
    throw new Error("Gold and silver rates were not found.");
  }

  const grate22 = Number(row.grate22);

  const grate18 = Number(row.grate18);

  const slvrate = Number(row.slvrate);

  if (
    !Number.isFinite(grate22) ||
    !Number.isFinite(grate18) ||
    !Number.isFinite(slvrate)
  ) {
    throw new Error("Invalid gold and silver rates received from database.");
  }

  return {
    grate22,

    grate18,

    slvrate,
  };
}

type DatabaseTodayResponse = {
  today?: string | null;
};

export async function getDatabaseToday(): Promise<string> {
  const username = await getUsername();
  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const sql = `
    SELECT today
    FROM goldrate
  `;

  const row = await apiPost<DatabaseTodayResponse>(
    "/api/query/execute?type=object",
    {
      sql,
      params: {},
    },
    {
      username,
      password,
    },
  );

  const rawDate = String(row?.today ?? "").trim();

  // Expected database response: YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(rawDate);

  if (!match) {
    throw new Error(
      `Invalid date received from goldrate: ${rawDate || "empty response"}`,
    );
  }

  const [, year, month, day] = match;

  // Convert YYYY-MM-DD into the screen's DD/MM/YYYY format.
  return `${day}/${month}/${year}`;
}

type DeviceIdLookupResult = {
  found: boolean;

  value?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDeviceIdLookupResult(response: unknown): DeviceIdLookupResult {
  let current = response;

  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      if (current.length === 0) {
        return { found: false };
      }

      current = current[0];

      continue;
    }

    if (!isRecord(current)) {
      return { found: false };
    }

    if (Object.prototype.hasOwnProperty.call(current, "id")) {
      return { found: true, value: current.id };
    }

    const wrapperKey = ["data", "result", "rows", "results", "record"].find(
      (key) => Object.prototype.hasOwnProperty.call(current, key),
    );

    if (!wrapperKey) {
      return { found: false };
    }

    current = current[wrapperKey];
  }

  return { found: false };
}

export async function getDeviceDatabaseId(deviceId: string): Promise<number> {
  const safeDeviceId = deviceId.trim();

  // Step 1: Validate device UUID

  if (!safeDeviceId) {
    throw new Error("Device UUID is missing; cannot look up its database ID.");
  }

  // Step 2: Get branch API credentials

  const username = await getUsername();

  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  // Step 3: SQL query to find numeric devices.id using device UUID

  const sql = `

  SELECT id

  FROM public.device

  WHERE device_id = CAST(:deviceId AS UUID)

  LIMIT 1

`;

  // Step 4: Execute query through branch API

  const response = await apiPost<unknown>(
    "/api/query/execute?type=object",

    {
      sql,

      params: {
        deviceId: safeDeviceId,
      },
    },

    {
      username,

      password,
    },
  );

  // Step 5: Debug information

  console.log("========== DEVICE LOOKUP DEBUG ==========");

  console.log("API BASE URL:", getApiBaseUrl());

  console.log("DEVICE UUID SENT:", safeDeviceId);

  console.log("SQL QUERY:", sql);

  console.log("API RESPONSE:", JSON.stringify(response, null, 2));

  console.log("RESPONSE IS ARRAY:", Array.isArray(response));

  console.log("RESPONSE TYPE:", typeof response);

  console.log("==========================================");

  // Step 6: Check whether SQL execution failed

  if (isRecord(response) && response.success === false) {
    throw new Error(
      `Device lookup SQL execution failed: ${String(
        response.error ?? "Unknown database error",
      )}`,
    );
  }

  // Step 7: Extract numeric database ID

  const responseType = Array.isArray(response)
    ? "array"
    : response === null
      ? "null"
      : typeof response;

  const responseKeys = isRecord(response)
    ? Object.keys(response)
    : Array.isArray(response) && isRecord(response[0])
      ? Object.keys(response[0])
      : [];

  const lookupResult = getDeviceIdLookupResult(response);

  console.log("[DEVICE LOOKUP] UUID:", safeDeviceId);

  console.log("[DEVICE LOOKUP] Response type:", responseType);

  console.log("[DEVICE LOOKUP] Response keys:", responseKeys);

  console.log("[DEVICE LOOKUP] Raw API response:", response);

  console.log("[DEVICE LOOKUP] Extracted ID value:", lookupResult.value);

  // Step 8: Check whether the device record exists

  if (!lookupResult.found) {
    throw new Error(
      `No device record was found in the branch database for UUID ${safeDeviceId}.`,
    );
  }

  // Step 9: Convert ID into a valid positive integer

  const databaseId = Number(lookupResult.value);

  if (!Number.isSafeInteger(databaseId) || databaseId <= 0) {
    throw new Error(
      `The device lookup returned an invalid database ID for UUID ${safeDeviceId}.`,
    );
  }

  // Step 10: Return numeric database ID

  console.log("[DEVICE LOOKUP] Numeric database ID:", databaseId);

  return databaseId;
}

// export async function createSalesEntry(

//   payload: CreateSalesEntryRequest,

//   shopcode: string,

// ): _Promise_<number> {

//   const username = await _getUsername_();

//   const password = await _getPassword_();

//   const result = await _apiPost_<number>(

//     `/salesentry/create?shopcode=${_encodeURIComponent_(shopcode)}`,

//     payload,

//     {

//       username: username ?? "",

//       password: password ?? "",

//     },

//   );

//   return result;

// }

export async function createSalesEntry(
  payload: CreateSalesEntryRequest,

  shopcode: string,
): Promise<number> {
  const username = await getUsername();

  const password = await getPassword();

  // 1. Log complete request

  console.log("========== CREATE SALES ENTRY ==========");

  console.log("SHOPCODE:", shopcode);

  console.log("USERNAME:", username);

  // 2. Log General Information

  console.log("========== GENERAL DATA ==========");

  console.log(JSON.stringify(payload.general, null, 2));

  // 3. Log Sales Items

  console.log("========== SALES DATA ==========");

  console.log(JSON.stringify(payload.sales, null, 2));

  // 4. Log Stone Information

  console.log("========== STONE DATA ==========");

  console.log(JSON.stringify(payload.stones, null, 2));

  // 5. Log all request fields

  console.log("========== COMPLETE PAYLOAD ==========");

  console.log(JSON.stringify(payload, null, 2));

  try {
    const result = await apiPost<number>(
      `/salesentry/create?shopcode=${encodeURIComponent(shopcode)}`,

      payload,

      {
        username: username ?? "",

        password: password ?? "",
      },
    );

    console.log("========== API RESPONSE ==========");

    console.log("Generated Estimate Number:", result);

    return result;
  } catch (error) {
    console.error("========== SALES ENTRY ERROR ==========");

    console.error(error);

    throw error;
  }
}

// export async function createSaleEstimate(

//   request: SaleEstimateRequest,

// ): Promise<SaleEstimateResponse> {

//   return apiPost<SaleEstimateResponse>(

//     "/api/sale-estimates",

//     request,

//   );

// }

// --- Stock Taking helpers (used by Stock Taking tab) ---

export type StockItem = { desc: string; code: string };

export async function getItemsByCounter(
  counterCode: string,
): Promise<StockItem[]> {
  return apiGet<StockItem[]>(
    `/api/v1/item-by-counter?counterCode=${encodeURIComponent(counterCode)}`,
  );
}

type StoneWeightCheckRow = {
  weights_same?: boolean | string;
};

export async function checkBarcodeStoneWeight(
  barcode: string,
): Promise<boolean> {
  const username = await getUsername();

  const password = await getPassword();

  if (!username || !password) {
    throw new Error("Branch API credentials are not available.");
  }

  const safeBarcode = barcode.trim();

  if (!safeBarcode) {
    throw new Error("Barcode is required.");
  }

  const sql = `

    SELECT CASE

      WHEN NOT EXISTS (

        SELECT 1

        FROM barcodeandstone b

        WHERE b.barcode = m.barcode

      ) THEN TRUE

      WHEN ROUND(COALESCE(m.stoneweight, 0)::numeric, 3) =

        ROUND(

          COALESCE(

            SUM(

              CASE

                WHEN s.s_unit = 'C' THEN b.stonewt * 0.2

                ELSE b.stonewt

              END

            ),

            0

          )::numeric,

          3

        ) THEN TRUE

      ELSE FALSE

    END AS weights_same

    FROM mainstock m

    LEFT JOIN barcodeandstone b ON b.barcode = m.barcode

    LEFT JOIN stonemaster s ON s.s_code = b.stonecode

    WHERE m.barcode = :barcode

    GROUP BY m.barcode, m.stoneweight

  `;

  const row = await apiPost<StoneWeightCheckRow>(
    "/api/query/execute?type=object",

    {
      sql,

      params: { barcode: safeBarcode },
    },

    { username, password },
  );

  return row?.weights_same === true || row?.weights_same === "true";
}
