import { apiGet } from './apiClient';

export type Operator = {
  name: string;
  code: string;
};

export async function getAllOperators(): Promise<Operator[]> {
  return apiGet<Operator[]>('/api/v1/salesman');
}