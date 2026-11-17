import type { BarcodeItemDetail } from "@/services/itemApi";

const RECEIPT_WIDTH = 32;
const RECEIPT_SEPARATOR = "-".repeat(RECEIPT_WIDTH);

export type EstimateReceiptCustomer = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  place: string;
  phoneNumber: string;
  salesman: string;
};

export type EstimateReceiptData = {
  estimateNo: number;
  estimateDate: string;
  rate: number | string;
  shopCode: string;
  customer: EstimateReceiptCustomer;
  items: BarcodeItemDetail[];
};

const toNumber = (value: number | string | undefined): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatWeight = (value: number): string => value.toFixed(3);
const formatAmount = (value: number): string => value.toFixed(2);

const formatLabelValue = (label: string, value: string): string =>
  `${label}${value.padStart(Math.max(0, RECEIPT_WIDTH - label.length))}`;

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim();

const wrapText = (value: string, width: number): string[] => {
  const lines: string[] = [];
  let line = "";

  for (const word of value.split(" ")) {
    if (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }

      for (let offset = 0; offset < word.length; offset += width) {
        lines.push(word.slice(offset, offset + width));
      }
      continue;
    }

    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
};

const appendField = (lines: string[], label: string, value: string): void => {
  const prefix = `${label}: `;
  const contentWidth = Math.max(1, RECEIPT_WIDTH - prefix.length);
  const wrappedValue = wrapText(cleanText(value), contentWidth);

  if (wrappedValue.length === 0) {
    lines.push(`${label}:`);
    return;
  }

  lines.push(`${prefix}${wrappedValue[0]}`);
  const continuationPrefix = " ".repeat(prefix.length);
  lines.push(
    ...wrappedValue.slice(1).map((line) => `${continuationPrefix}${line}`),
  );
};

export function formatEstimateReceipt(data: EstimateReceiptData): string {
  const totals = data.items.reduce<{
    grossWeight: number;
    stoneWeight: number;
    netWeight: number;
    metalAmount: number;
    vaAmount: number;
    taxableAmount: number;
    gstAmount: number;
    netAmount: number;
    stoneCharge: number;
  }>(
    (sum, item) => ({
      grossWeight: sum.grossWeight + toNumber(item.grossWeight),
      stoneWeight: sum.stoneWeight + toNumber(item.stoneWeight),
      netWeight: sum.netWeight + toNumber(item.netWeight),
      metalAmount: sum.metalAmount + toNumber(item.metalAmount),
      vaAmount: sum.vaAmount + toNumber(item.vaAmount),
      taxableAmount: sum.taxableAmount + toNumber(item.taxableAmount),
      gstAmount: sum.gstAmount + toNumber(item.gstAmount),
      netAmount: sum.netAmount + toNumber(item.netAmount),
      stoneCharge: sum.stoneCharge + toNumber(item.stoneCharge),
    }),
    {
      grossWeight: 0,
      stoneWeight: 0,
      netWeight: 0,
      metalAmount: 0,
      vaAmount: 0,
      taxableAmount: 0,
      gstAmount: 0,
      netAmount: 0,
      stoneCharge: 0,
    },
  );

  const lines = [
    "ESTIMATE ONLY".padStart(
      Math.floor((RECEIPT_WIDTH + "ESTIMATE ONLY".length) / 2),
    ),
    "",
  ];

  appendField(lines, "Estimate No", String(data.estimateNo));
  appendField(lines, "Salesman", data.customer.salesman);
  appendField(lines, "Date", data.estimateDate);
  appendField(lines, "Rate", formatAmount(toNumber(data.rate)));
  lines.push("");
  appendField(lines, "Name", data.customer.name);
  appendField(lines, "Address", data.customer.addressLine1);

  if (cleanText(data.customer.addressLine2)) {
    const continuationPrefix = "         ";
    lines.push(
      ...wrapText(
        cleanText(data.customer.addressLine2),
        RECEIPT_WIDTH - continuationPrefix.length,
      ).map((line) => `${continuationPrefix}${line}`),
    );
  }

  appendField(lines, "Place", data.customer.place);
  appendField(lines, "Phone", data.customer.phoneNumber);
  lines.push("", "SALES ITEMS", RECEIPT_SEPARATOR);

  for (const [index, item] of data.items.entries()) {
    appendField(lines, `Item ${index + 1}`, item.itemName ?? "");
    appendField(lines, "Gross wt", formatWeight(toNumber(item.grossWeight)));
    appendField(lines, "Stone wt", formatWeight(toNumber(item.stoneWeight)));
    appendField(lines, "Net wt", formatWeight(toNumber(item.netWeight)));
    appendField(
      lines,
      "Stone charge",
      formatAmount(toNumber(item.stoneCharge)),
    );
    appendField(lines, "Amount", formatAmount(toNumber(item.taxableAmount)));
    lines.push("");
  }

  lines.push(
    RECEIPT_SEPARATOR,
    formatLabelValue(
      "Total Gross Weight: ",
      formatWeight(totals.grossWeight),
    ),
    formatLabelValue(
      "Total Stone Weight: ",
      formatWeight(totals.stoneWeight),
    ),
    formatLabelValue("Total Net Weight: ", formatWeight(totals.netWeight)),
    formatLabelValue(
      "Total Amount: ",
      formatAmount(totals.taxableAmount),
    ),
    formatLabelValue("Total Quantity: ", String(data.items.length)),
    "",
    formatLabelValue("Gold Value: ", formatAmount(totals.metalAmount)),
    formatLabelValue("Value Addition: ", formatAmount(totals.vaAmount)),
    formatLabelValue("Amount: ", formatAmount(totals.taxableAmount)),
    formatLabelValue("GST: ", formatAmount(totals.gstAmount)),
    formatLabelValue("Bill Amt Payable: ", formatAmount(totals.netAmount)),
    RECEIPT_SEPARATOR,
    "",
    `Shop: ${cleanText(data.shopCode)}`,
    "THANK YOU".padStart(Math.floor((RECEIPT_WIDTH + "THANK YOU".length) / 2)),
  );

  return lines.join("\n");
}

export function estimateReceiptToHtml(receipt: string): string {
  const escapedReceipt = receipt.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: 58mm auto; margin: 2mm; }
      html, body { margin: 0; padding: 0; }
      body { width: 54mm; font-family: monospace; font-size: 7pt; }
      pre { margin: 0; line-height: 1.2; white-space: pre; }
    </style>
  </head>
  <body><pre>${escapedReceipt}</pre></body>
</html>`;
}
