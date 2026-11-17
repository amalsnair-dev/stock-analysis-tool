import {ownerApiGet} from './ownerApiClient';

export async function getBranchCodes(
  companyId: string,
): Promise<string[]> {
  return ownerApiGet<string[]>(
    `/api/public/branch-codes?companyId=${encodeURIComponent(companyId)}`,
  );
}