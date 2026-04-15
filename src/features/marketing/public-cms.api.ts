import { getApiData } from "@/shared/api/client";
import type { PublicCmsHomeResponse } from "@/features/marketing/public-cms.model";

export async function getPublicCmsHomeApi(): Promise<PublicCmsHomeResponse> {
  return getApiData<PublicCmsHomeResponse>("/public/cms/home");
}

export const publicCmsHomeQueryKey = ["public", "cms", "home"] as const;
