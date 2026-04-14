import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ProfilePaymentHistory from "@/features/profile/components/ProfilePaymentHistory";
import { getMyProfileApi } from "@/features/profile/api";
import { profileQueryKeys } from "@/features/profile/queryKeys";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import { navigateToUserDashboardSection } from "@/shared/navigation/dashboard-navigation";
import { InlineLoadingState } from "@/shared/ui/state";

const PaymentsScreen = () => {
  const navigate = useNavigate();
  const handleSectionChange = (section: string) => navigateToUserDashboardSection(navigate, section);
  const profileQuery = useQuery({
    queryKey: profileQueryKeys.user(),
    queryFn: getMyProfileApi,
  });
  const profile = profileQuery.data ?? null;

  return (
    <UserLayout activeSection="settings" onSectionChange={handleSectionChange}>
      <UserSectionShell
        title={
          <>
            Payment <span className="text-orange-500">History</span>
          </>
        }
        description="Review membership payments, billing details, and wallet transaction status."
      >
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border table-border table-bg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-orange-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-white">Payments</p>
              {profileQuery.isLoading ? (
                <div className="mt-2">
                  <InlineLoadingState label="Loading account..." />
                </div>
              ) : (
                <>
                  <p className="mt-1 truncate text-sm font-bold text-white">
                    {profile?.userName?.trim() || "-"}
                  </p>
                  <p className="mt-0.5 break-all text-xs font-medium text-slate-400">
                    {profile?.email ?? ""}
                  </p>
                </>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                Billing activity is listed below; account changes stay in settings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Settings
          </button>
        </div>

        <ProfilePaymentHistory />
      </UserSectionShell>
    </UserLayout>
  );
};

export default PaymentsScreen;
