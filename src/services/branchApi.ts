import { ownerApiGet } from "./ownerApiClient";

export type BranchBaseUrlResponse = {
  baseUrl: string;
  username: string;
  password: string;
  branchCode: string;
  companyId: string;
};

export async function getBranchBaseUrl(
  companyId: string,
  branchCode: string,
): Promise<BranchBaseUrlResponse> {
  return ownerApiGet<BranchBaseUrlResponse>(
    `/api/public/base-url?companyId=${encodeURIComponent(
      companyId,
    )}&branchCode=${encodeURIComponent(branchCode)}`,
  );
}
