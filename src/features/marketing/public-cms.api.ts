import apiClient from "@/shared/api/client";
import type { PublicCmsHomeResponse } from "@/features/marketing/public-cms.model";

export async function getPublicCmsHomeApi(): Promise<PublicCmsHomeResponse> {
  const response = await apiClient.get<PublicCmsHomeResponse>("/public/cms/home");
  return response.data;
}

export const publicCmsHomeQueryKey = ["public", "cms", "home"] as const;
