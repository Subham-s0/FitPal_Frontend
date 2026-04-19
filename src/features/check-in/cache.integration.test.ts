import { QueryClient } from "@tanstack/react-query";
import { dashboardQueryKeys } from "@/features/user-dashboard/api";
import type { GymCheckInResponse } from "@/features/check-in/model";
import { refreshCheckInState, syncCheckInVisitCache } from "@/features/check-in/cache";
import { checkInQueryKeys } from "@/features/check-in/queryKeys";

const createVisit = (overrides: Partial<GymCheckInResponse>): GymCheckInResponse => ({
  checkInId: "visit-1",
  gymId: 12,
  gymName: "FitPal Gym",
  gymLogoUrl: null,
  checkInAt: "2026-04-18T10:00:00.000Z",
  checkOutAt: null,
  status: "CHECKED_IN",
  denyReason: null,
  membershipTierAtCheckIn: null,
  withinRadius: true,
  radiusMetersAtCheckIn: 50,
  message: null,
  ...overrides,
});

describe("check-in cache sync integration (FE-CHECKIN-03, FE-CHECKIN-04)", () => {
  it("upserts and sorts check-in visits in active and list caches", () => {
    const queryClient = new QueryClient();

    const older = createVisit({
      checkInId: "visit-old",
      checkInAt: "2026-04-18T08:00:00.000Z",
      status: "CHECKED_IN",
    });
    const newer = createVisit({
      checkInId: "visit-new",
      checkInAt: "2026-04-18T09:00:00.000Z",
      status: "CHECKED_IN",
    });

    queryClient.setQueryData(checkInQueryKeys.active(), [older]);
    queryClient.setQueryData(checkInQueryKeys.lists(), [older]);

    syncCheckInVisitCache(queryClient, newer);

    const activeAfterInsert = queryClient.getQueryData<GymCheckInResponse[]>(checkInQueryKeys.active()) ?? [];
    const listAfterInsert = queryClient.getQueryData<GymCheckInResponse[]>(checkInQueryKeys.lists()) ?? [];

    expect(activeAfterInsert.map((item) => item.checkInId)).toEqual(["visit-new", "visit-old"]);
    expect(listAfterInsert.map((item) => item.checkInId)).toEqual(["visit-new", "visit-old"]);

    syncCheckInVisitCache(
      queryClient,
      createVisit({
        checkInId: "visit-new",
        checkInAt: "2026-04-18T11:00:00.000Z",
        status: "CHECKED_OUT",
      }),
    );

    const activeAfterUpdate = queryClient.getQueryData<GymCheckInResponse[]>(checkInQueryKeys.active()) ?? [];
    expect(activeAfterUpdate).toHaveLength(2);
    expect(activeAfterUpdate[0].checkInId).toBe("visit-new");
    expect(activeAfterUpdate[0].status).toBe("CHECKED_OUT");
  });

  it("invalidates both check-in and dashboard query families on refresh", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await refreshCheckInState(queryClient);

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: checkInQueryKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardQueryKeys.all });
  });
});
