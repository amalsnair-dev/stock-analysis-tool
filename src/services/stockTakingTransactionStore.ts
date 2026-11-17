import type { StockTakingTransactionResponse } from './stockTakingApi';

const transactionsBySlno = new Map<number, StockTakingTransactionResponse[]>();

export function getStoredTransactions(slno: number): StockTakingTransactionResponse[] {
  return transactionsBySlno.get(slno) ?? [];
}

export function addStoredTransaction(slno: number, transaction: StockTakingTransactionResponse): void {
  const prev = transactionsBySlno.get(slno) ?? [];
  transactionsBySlno.set(slno, [...prev, transaction]);
}

export function removeStoredTransaction(slno: number, barcode: string): void {
  const prev = transactionsBySlno.get(slno) ?? [];
  transactionsBySlno.set(slno, prev.filter(t => t.barcode !== barcode));
}