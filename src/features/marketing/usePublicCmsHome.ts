import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketingCmsFallback, type MarketingHomeCms } from "@/features/marketing/cms-store";
import { getPublicCmsHomeApi, publicCmsHomeQueryKey } from "@/features/marketing/public-cms.api";
import { mapPublicCmsHomeToMarketing } from "@/features/marketing/public-cms.mapper";

export type UsePublicCmsHomeResult = MarketingHomeCms & {
  /** True when showing seeded fallback (request failed or returned unusable data). */
  isFallback: boolean;
  isLoading: boolean;
};

export function usePublicCmsHome(): UsePublicCmsHomeResult {
  const fallback = useMemo(() => getMarketingCmsFallback(), []);

  const query = useQuery({
    queryKey: publicCmsHomeQueryKey,
    queryFn: getPublicCmsHomeApi,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  return useMemo(() => {
    const raw = query.data;
    const ok =
      query.isSuccess &&
      raw &&
      typeof raw === "object" &&
      Array.isArray(raw.features) &&
      Array.isArray(raw.testimonials) &&
      Array.isArray(raw.howToSteps) &&
      Array.isArray(raw.stats);

    if (ok) {
      try {
        return {
          ...mapPublicCmsHomeToMarketing(raw),
          isFallback: false,
          isLoading: false,
        };
      } catch {
        return { ...fallback, isFallback: true, isLoading: false };
      }
    }

    if (query.isPending) {
      return { ...fallback, isFallback: true, isLoading: true };
    }

    return { ...fallback, isFallback: true, isLoading: false };
  }, [query.isSuccess, query.isPending, query.data, fallback]);
}
