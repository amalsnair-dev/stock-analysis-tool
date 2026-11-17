import { apiGet } from './apiClient';

export type Counter = {
  name: string;
  code: string;
};

export function getCounterLabel(counter: Counter | null | undefined): string {
  if (!counter) return 'Select Counter';
  return counter.code?.trim() || counter.name || 'Select Counter';
}

export async function getAllCounters(): Promise<Counter[]> {
  return apiGet<Counter[]>('/api/v1/counters');
}