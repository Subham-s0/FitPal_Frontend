import type { QueryClient } from "@tanstack/react-query";

import { checkInQueryKeys } from "@/features/check-in/queryKeys";
import type { GymCheckInResponse } from "@/features/check-in/model";
import { dashboardQueryKeys } from "@/features/user-dashboard/api";

const sortNewestFirst = (items: GymCheckInResponse[]) =>
  [...items].sort(
    (left, right) =>
      new Date(right.checkInAt).getTime() - new Date(left.checkInAt).getTime()
  );

const upsertVisit = (
  current: GymCheckInResponse[] | undefined,
  visit: GymCheckInResponse
) => sortNewestFirst([visit, ...(current ?? []).filter((item) => item.checkInId !== visit.checkInId)]);

export function syncCheckInVisitCache(queryClient: QueryClient, visit: GymCheckInResponse) {
  queryClient.setQueryData<GymCheckInResponse[]>(
    checkInQueryKeys.active(),
    (current) => upsertVisit(current, visit)
  );
  queryClient.setQueryData<GymCheckInResponse[]>(
    checkInQueryKeys.lists(),
    (current) => upsertVisit(current, visit)
  );
}

export async function refreshCheckInState(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: checkInQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
  ]);
}
