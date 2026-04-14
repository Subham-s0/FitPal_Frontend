import { type ChangeEvent, type FC, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ImagePlus, Loader2, Pencil, Save, Trash2, Upload, X } from "lucide-react";

import type { GymDocumentType, GymPhotoResponse, GymProfileResponse } from "@/features/profile/model";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  createGymPhotoApi,
  deleteGymDocumentApi,
  deleteGymLogoApi,
  deleteGymPhotoApi,
  deleteUploadedAssetApi,
  getMyGymDocumentsApi,
  getMyGymPhotosApi,
  getMyGymProfileApi,
  patchGymBasicsStepApi,
  patchGymLocationStepApi,
  patchGymPayoutStepApi,
  updateGymPhotoApi,
  uploadDocumentFileApi,
  uploadGymLogoApi,
  uploadImageFileApi,
  upsertGymDocumentApi,
} from "@/features/profile/api";
import { getApiErrorMessage } from "@/shared/api/client";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";
const secLabel = "mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500";
const input =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-orange-500/40 disabled:opacity-60 disabled:cursor-not-allowed";

type TabId = "profile" | "documents" | "photos" | "checkinLocations";

const initials = (name?: string | null) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "GY";

function ApprovalPill({ status }: { status: GymProfileResponse["approvalStatus"] }) {
  const m: Record<string, { label: string; dot: string; cls: string }> = {
    APPROVED: { label: "Approved", dot: "bg-green-400", cls: "bg-green-500/10 text-green-400 border-green-500/25" },
    PENDING_REVIEW: { label: "Pending", dot: "bg-yellow-400", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
    REJECTED: { label: "Rejected", dot: "bg-red-400", cls: "bg-red-500/10 text-red-400 border-red-500/25" },
    DRAFT: { label: "Draft", dot: "bg-zinc-400", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  };
  const cfg = m[status] ?? m.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const DOC_TYPES: { value: GymDocumentType; label: string }[] = [
  { value: "REGISTRATION_CERTIFICATE", label: "Registration Certificate" },
  { value: "LICENSE", label: "Operating License / Permit" },
  { value: "TAX_CERTIFICATE", label: "Tax Certificate" },
  { value: "OWNER_ID_PROOF", label: "Owner ID Proof" },
  { value: "ADDRESS_PROOF", label: "Address Proof" },
  { value: "OTHER", label: "Other" },
];

const GymProfilePage: FC = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docDialogType, setDocDialogType] = useState<GymDocumentType>("REGISTRATION_CERTIFICATE");
  const [docDialogReplaceId, setDocDialogReplaceId] = useState<number | null>(null);
  const docDialogFileRef = useRef<HTMLInputElement>(null);

  const profileQ = useQuery({
    queryKey: ["gym-profile", "me"],
    queryFn: getMyGymProfileApi,
    staleTime: 30_000,
  });
  const docsQ = useQuery({
    queryKey: ["gym-profile", "me", "documents"],
    queryFn: getMyGymDocumentsApi,
    staleTime: 30_000,
  });
  const photosQ = useQuery({
    queryKey: ["gym-profile", "me", "photos"],
    queryFn: getMyGymPhotosApi,
    staleTime: 30_000,
  });

  const profile = profileQ.data ?? null;
  const locationLocked = profile?.approvalStatus === "APPROVED";
  const esewaLocked = Boolean(profile?.esewaWalletVerified);
  const khaltiLocked = Boolean(profile?.khaltiWalletVerified);

  const [basicsDraft, setBasicsDraft] = useState({
    gymName: "",
    gymType: "" as GymProfileResponse["gymType"] | "",
    establishedAt: "" as string,
    registrationNo: "",
    maxCapacity: "" as string,
    description: "",
    websiteUrl: "",
  });
  const [locationDraft, setLocationDraft] = useState({
    addressLine: "",
    city: "",
    country: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    phoneNo: "",
    contactEmail: "",
    opensAt: "",
    closesAt: "",
  });
  const [payoutDraft, setPayoutDraft] = useState({
    esewaEnabled: false,
    esewaWalletId: "",
    esewaAccountName: "",
    khaltiEnabled: false,
    khaltiWalletId: "",
    khaltiAccountName: "",
  });

  const resetDraftsFromProfile = (nextProfile: GymProfileResponse | null) => {
    if (!nextProfile) return;
    setBasicsDraft({
      gymName: nextProfile.gymName ?? "",
      gymType: nextProfile.gymType ?? "",
      establishedAt: nextProfile.establishedAt ? String(nextProfile.establishedAt) : "",
      registrationNo: nextProfile.registrationNo ?? "",
      maxCapacity: nextProfile.maxCapacity ? String(nextProfile.maxCapacity) : "",
      description: nextProfile.description ?? "",
      websiteUrl: nextProfile.websiteUrl ?? "",
    });
    setLocationDraft({
      addressLine: nextProfile.addressLine ?? "",
      city: nextProfile.city ?? "",
      country: nextProfile.country ?? "",
      postalCode: nextProfile.postalCode ?? "",
      latitude: typeof nextProfile.latitude === "number" ? String(nextProfile.latitude) : "",
      longitude: typeof nextProfile.longitude === "number" ? String(nextProfile.longitude) : "",
      phoneNo: nextProfile.phoneNo ?? "",
      contactEmail: nextProfile.contactEmail ?? "",
      opensAt: nextProfile.opensAt ?? "",
      closesAt: nextProfile.closesAt ?? "",
    });
    setPayoutDraft({
      esewaEnabled: Boolean(nextProfile.esewaWalletId || nextProfile.esewaAccountName),
      esewaWalletId: nextProfile.esewaWalletId ?? "",
      esewaAccountName: nextProfile.esewaAccountName ?? "",
      khaltiEnabled: Boolean(nextProfile.khaltiWalletId || nextProfile.khaltiAccountName),
      khaltiWalletId: nextProfile.khaltiWalletId ?? "",
      khaltiAccountName: nextProfile.khaltiAccountName ?? "",
    });
  };

  const didInitRef = useRef(false);
  if (profile && !didInitRef.current) {
    didInitRef.current = true;
    resetDraftsFromProfile(profile);
  }

  const patchBasicsMut = useMutation({
    mutationFn: () =>
      patchGymBasicsStepApi({
        gymName: basicsDraft.gymName.trim() || undefined,
        gymType: (basicsDraft.gymType || undefined) as GymProfileResponse["gymType"] | undefined,
        establishedAt: basicsDraft.establishedAt.trim() ? Number(basicsDraft.establishedAt) : undefined,
        registrationNo: basicsDraft.registrationNo.trim() || undefined,
        maxCapacity: basicsDraft.maxCapacity.trim() ? Number(basicsDraft.maxCapacity) : undefined,
      }),
    onSuccess: (next) => {
      qc.setQueryData(["gym-profile", "me"], next);
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const patchLocationMut = useMutation({
    mutationFn: () =>
      patchGymLocationStepApi({
        addressLine: locationDraft.addressLine.trim() || undefined,
        city: locationDraft.city.trim() || undefined,
        country: locationDraft.country.trim() || undefined,
        postalCode: locationDraft.postalCode.trim() || undefined,
        latitude: locationDraft.latitude.trim() ? Number(locationDraft.latitude) : undefined,
        longitude: locationDraft.longitude.trim() ? Number(locationDraft.longitude) : undefined,
        phoneNo: locationDraft.phoneNo.trim() || undefined,
        contactEmail: locationDraft.contactEmail.trim() || undefined,
        description: basicsDraft.description.trim() || undefined,
        websiteUrl: basicsDraft.websiteUrl.trim() || undefined,
        opensAt: locationDraft.opensAt.trim() || undefined,
        closesAt: locationDraft.closesAt.trim() || undefined,
      }),
    onSuccess: (next) => {
      qc.setQueryData(["gym-profile", "me"], next);
      toast.success("Location updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const patchPayoutMut = useMutation({
    mutationFn: () =>
      patchGymPayoutStepApi({
        esewaEnabled: payoutDraft.esewaEnabled,
        esewaWalletId: payoutDraft.esewaWalletId.trim() || undefined,
        esewaAccountName: payoutDraft.esewaAccountName.trim() || undefined,
        khaltiEnabled: payoutDraft.khaltiEnabled,
        khaltiWalletId: payoutDraft.khaltiWalletId.trim() || undefined,
        khaltiAccountName: payoutDraft.khaltiAccountName.trim() || undefined,
      }),
    onSuccess: (next) => {
      qc.setQueryData(["gym-profile", "me"], next);
      toast.success("Payout wallets updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const logoUploadMut = useMutation({
    mutationFn: (file: File) => uploadGymLogoApi(file),
    onMutate: async () => {
      const prev = qc.getQueryData<GymProfileResponse>(["gym-profile", "me"]);
      return {
        prevLogoPublicId: prev?.logoPublicId ?? null,
        prevLogoResourceType: prev?.logoResourceType ?? null,
        prevLogoUrl: prev?.logoUrl ?? null,
      };
    },
    onSuccess: async (next, _vars, ctx) => {
      qc.setQueryData(["gym-profile", "me"], next);
      if (
        ctx?.prevLogoPublicId &&
        ctx?.prevLogoResourceType &&
        ctx.prevLogoPublicId !== next.logoPublicId
      ) {
        try {
          await deleteUploadedAssetApi({
            publicId: ctx.prevLogoPublicId,
            resourceType: ctx.prevLogoResourceType,
            fileUrl: ctx.prevLogoUrl ?? undefined,
          });
        } catch {
          // best-effort cleanup; don't block the UX
        }
      }
      toast.success("Logo updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const logoDeleteMut = useMutation({
    mutationFn: () => deleteGymLogoApi(),
    onSuccess: (next) => {
      qc.setQueryData(["gym-profile", "me"], next);
      toast.success("Logo removed");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const [docType, setDocType] = useState<GymDocumentType>("REGISTRATION_CERTIFICATE");
  const docUploadMut = useMutation({
    mutationFn: async ({
      file,
      type,
      replaceOf,
    }: {
      file: File;
      type: GymDocumentType;
      replaceOf?: { publicId: string; resourceType: string; fileUrl: string } | null;
    }) => {
      const uploaded = await uploadDocumentFileApi(file, "gyms/documents");
      try {
        const saved = await upsertGymDocumentApi({
          documentType: type,
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          fileUrl: uploaded.secureUrl || uploaded.url,
        });
        if (replaceOf?.publicId && replaceOf?.resourceType) {
          try {
            await deleteUploadedAssetApi({
              publicId: replaceOf.publicId,
              resourceType: replaceOf.resourceType,
              fileUrl: replaceOf.fileUrl,
            });
          } catch {
            // best-effort
          }
        }
        return saved;
      } catch (e) {
        await deleteUploadedAssetApi({
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          fileUrl: uploaded.secureUrl || uploaded.url,
        });
        throw e;
      }
    },
    onSuccess: async () => {
      await docsQ.refetch();
      toast.success("Document uploaded");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const docDeleteMut = useMutation({
    mutationFn: (documentId: number) => deleteGymDocumentApi(documentId),
    onSuccess: async () => {
      await docsQ.refetch();
      toast.success("Document deleted");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const photoCreateMut = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const uploaded = await uploadImageFileApi(file, "gyms/photos");
      try {
        return await createGymPhotoApi({
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          photoUrl: uploaded.secureUrl || uploaded.url,
          caption: caption.trim() || undefined,
        });
      } catch (e) {
        await deleteUploadedAssetApi({
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          fileUrl: uploaded.secureUrl || uploaded.url,
        });
        throw e;
      }
    },
    onSuccess: async () => {
      await photosQ.refetch();
      toast.success("Photo added");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const photoDeleteMut = useMutation({
    mutationFn: (photoId: number) => deleteGymPhotoApi(photoId),
    onSuccess: async () => {
      await photosQ.refetch();
      toast.success("Photo deleted");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const photoUpdateMut = useMutation({
    mutationFn: ({ photoId, payload }: { photoId: number; payload: { caption?: string; cover?: boolean } }) =>
      updateGymPhotoApi(photoId, payload),
    onSuccess: async () => {
      await photosQ.refetch();
      toast.success("Photo updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const loading = profileQ.isLoading || docsQ.isLoading || photosQ.isLoading;
  const isMutating =
    patchBasicsMut.isPending ||
    patchLocationMut.isPending ||
    patchPayoutMut.isPending ||
    logoUploadMut.isPending ||
    logoDeleteMut.isPending ||
    docUploadMut.isPending ||
    docDeleteMut.isPending ||
    photoCreateMut.isPending ||
    photoDeleteMut.isPending ||
    photoUpdateMut.isPending;

  const coverPhotoUrl = useMemo(() => {
    const list = photosQ.data ?? [];
    const cover = list.find((p) => p.cover)?.photoUrl;
    return cover ?? list[0]?.photoUrl ?? null;
  }, [photosQ.data]);

  const doBasicsSave = async () => {
    await patchBasicsMut.mutateAsync();
    // keep description + website with location endpoint (backend stores those in location step)
    await patchLocationMut.mutateAsync();
  };

  const doLocationSave = async () => {
    if (locationLocked) {
      toast.info("Location settings are locked after approval.");
      return;
    }
    await patchLocationMut.mutateAsync();
  };

  const doPayoutSave = async () => {
    await patchPayoutMut.mutateAsync();
  };

  const doProfileSave = async () => {
    await doBasicsSave();
    await doPayoutSave();
  };

  const isEditableTab = tab === "profile" || tab === "checkinLocations";
  const canEditCurrentTab = tab === "profile" || (tab === "checkinLocations" && !locationLocked);
  const savePending = patchBasicsMut.isPending || patchLocationMut.isPending || patchPayoutMut.isPending;

  useEffect(() => {
    setIsEditing(false);
  }, [tab]);

  const saveActiveTab = async () => {
    try {
      if (tab === "profile") {
        await doProfileSave();
        setIsEditing(false);
        return;
      }
      if (tab === "checkinLocations") {
        await doLocationSave();
        if (!locationLocked) setIsEditing(false);
      }
    } catch {
      // errors are already surfaced through mutation handlers
    }
  };

  const cancelEditing = () => {
    resetDraftsFromProfile(profile);
    setIsEditing(false);
  };

  const headerRight = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {profile && <ApprovalPill status={profile.approvalStatus} />}
      {isEditableTab && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          disabled={!canEditCurrentTab || loading || isMutating}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          {canEditCurrentTab ? "Edit" : "Locked"}
        </button>
      )}

      {tab === "documents" && (
        <button
          type="button"
          onClick={() => {
            setDocDialogType(docType);
            setDocDialogReplaceId(null);
            setDocDialogOpen(true);
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-orange-500/40 bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-orange-400 shadow-[inset_0_0_12px_rgba(249,115,22,0.2)] transition-all hover:border-orange-500/60 hover:bg-orange-500/10 hover:shadow-[inset_0_0_16px_rgba(249,115,22,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {docUploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </button>
      )}
      {tab === "photos" && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-orange-500/40 bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-orange-400 shadow-[inset_0_0_12px_rgba(249,115,22,0.2)] transition-all hover:border-orange-500/60 hover:bg-orange-500/10 hover:shadow-[inset_0_0_16px_rgba(249,115,22,0.4)]">
          {photoCreateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Add photo
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              e.target.value = "";
              void photoCreateMut.mutateAsync({ file: f, caption: "" });
            }}
          />
        </label>
      )}
    </div>
  );

  return (
    <div className="max-w-[1600px] animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black uppercase tracking-tight">
            {profile?.gymName ?? "Your gym"} <span className="text-gradient-fire">Profile</span>
          </h1>
        </div>
        {headerRight}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="mb-5 sm:mb-6">
        <TabsList className="flex h-auto w-full max-w-full gap-0 overflow-x-auto border-b border-white/10 bg-transparent p-0 px-2 sm:w-fit sm:rounded-full sm:border sm:bg-black/40 sm:p-1 sm:backdrop-blur-sm">
          {(
            [
              { id: "profile", label: "Profile" },
              { id: "documents", label: "Documents" },
              { id: "photos", label: "Photos" },
              { id: "checkinLocations", label: "Check-in / Locations" },
            ] as const
          ).map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className={cn(
                "group relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider",
                "text-slate-400 hover:text-white sm:flex-initial sm:rounded-full sm:px-5 sm:py-2.5 sm:text-[10px]",
                "sm:hover:bg-white/5",
                "data-[state=active]:text-orange-500 data-[state=active]:sm:bg-orange-600 data-[state=active]:sm:text-white",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
              )}
            >
              <span className="whitespace-nowrap">{t.label}</span>
              <span
                className="absolute inset-x-0 bottom-0 hidden h-[2px] bg-orange-500 group-data-[state=active]:block sm:!hidden"
                aria-hidden
              />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="border border-white/10 bg-[#0a0a0a] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Upload document</DialogTitle>
            <DialogDescription className="text-[12px] text-zinc-600">
              Select the document type first, then upload the file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Document type</div>
              <Select value={docDialogType} onValueChange={(v) => setDocDialogType(v as GymDocumentType)}>
                <SelectTrigger className="h-[40px] rounded-xl border border-white/[0.08] bg-white/[0.04] text-[12px] font-semibold text-white focus:ring-orange-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-[#0a0a0a] text-white">
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-[12px] focus:bg-white/[0.06]">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => docDialogFileRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-orange-400 hover:bg-orange-500/15"
            >
              <Upload className="h-4 w-4" />
              Choose file
            </button>

            <input
              type="file"
              className="hidden"
              ref={docDialogFileRef}
              accept=".pdf,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                e.target.value = "";
                const replace = (docsQ.data ?? []).find((d) => d.documentId === docDialogReplaceId) ?? null;
                void docUploadMut
                  .mutateAsync({
                    file: f,
                    type: docDialogType,
                    replaceOf: replace ? { publicId: replace.publicId, resourceType: replace.resourceType, fileUrl: replace.fileUrl } : null,
                  })
                  .then(() => setDocDialogOpen(false));
              }}
            />

            <div className="text-[11px] text-zinc-600">Allowed: PDF, images. Approved documents are locked.</div>
          </div>
        </DialogContent>
      </Dialog>

      {profileQ.isError && (
        <div className={`${card} mb-4`}>
          <div className="text-sm font-bold text-red-400">Failed to load gym profile</div>
          <div className="mt-1 text-xs text-zinc-600">{getApiErrorMessage(profileQ.error)}</div>
        </div>
      )}

      {loading && !profile && (
        <div className={`${card} flex items-center gap-2`}>
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span className="text-xs text-zinc-600">Loading…</span>
        </div>
      )}

      {profile && tab === "profile" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={card}>
              <p className={secLabel}>Branding</p>
              <div className="mb-4 flex items-center gap-3.5">
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt={profile.gymName ?? "Gym"}
                    className="h-[72px] w-[72px] flex-shrink-0 rounded-2xl border-[1.5px] border-orange-500/25 object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-orange-500/25 bg-orange-500/[0.08] text-xl font-black">
                    <span className="text-gradient-fire">{initials(profile.gymName)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{profile.gymName ?? "—"}</div>
                  <div className="mb-2 text-[10px] text-zinc-600">
                    {(profile.gymType ?? "—") + (profile.establishedAt ? ` · Est. ${profile.establishedAt}` : "")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-400 shadow-[inset_0_0_8px_rgba(249,115,22,0.15)] transition-all hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[inset_0_0_12px_rgba(249,115,22,0.3)] ${
                        isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-50 pointer-events-none"
                      }`}
                    >
                      {logoUploadMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Change logo
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          e.target.value = "";
                          void logoUploadMut.mutateAsync(f);
                        }}
                      />
                    </label>
                    {profile.logoUrl && (
                      <button
                        type="button"
                        onClick={() => void logoDeleteMut.mutateAsync()}
                        disabled={!isEditing || logoDeleteMut.isPending}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] transition-all hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {logoDeleteMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-3">
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Cover photo</div>
                {coverPhotoUrl ? (
                  <img src={coverPhotoUrl} alt="Cover" className="h-[140px] w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-[140px] w-full items-center justify-center rounded-lg border border-dashed border-orange-500/20 bg-orange-500/[0.04] text-[11px] text-zinc-600">
                    Add photos to show a cover image
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Gym name</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={basicsDraft.gymName}
                    onChange={(e) => setBasicsDraft((d) => ({ ...d, gymName: e.target.value }))}
                    placeholder="Your gym name"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Gym type</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={basicsDraft.gymType}
                    onChange={(e) => setBasicsDraft((d) => ({ ...d, gymType: e.target.value as GymProfileResponse["gymType"] | "" }))}
                    placeholder="Commercial / CrossFit / Yoga…"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Established year</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={basicsDraft.establishedAt}
                    onChange={(e) => setBasicsDraft((d) => ({ ...d, establishedAt: e.target.value }))}
                    placeholder="e.g. 2019"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Max capacity</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={basicsDraft.maxCapacity}
                    onChange={(e) => setBasicsDraft((d) => ({ ...d, maxCapacity: e.target.value }))}
                    placeholder="e.g. 150"
                    inputMode="numeric"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Registration no</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={basicsDraft.registrationNo}
                    onChange={(e) => setBasicsDraft((d) => ({ ...d, registrationNo: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className={card}>
              <p className={secLabel}>Description & contact (editable)</p>
              <div className="mb-3">
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Description</div>
                <textarea
                  className={`${input} min-h-[110px] resize-y py-2.5`}
                  disabled={!isEditing}
                  value={basicsDraft.description}
                  onChange={(e) => setBasicsDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Tell members what makes your gym great…"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Website</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={basicsDraft.websiteUrl}
                    onChange={(e) => setBasicsDraft((d) => ({ ...d, websiteUrl: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Login email (read-only)</div>
                  <input className={input} value={profile.registeredEmail ?? ""} disabled />
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Contact email</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={locationDraft.contactEmail}
                    onChange={(e) => setLocationDraft((d) => ({ ...d, contactEmail: e.target.value }))}
                    placeholder="hello@gym.com"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Phone</div>
                  <input
                    className={input}
                    disabled={!isEditing}
                    value={locationDraft.phoneNo}
                    onChange={(e) => setLocationDraft((d) => ({ ...d, phoneNo: e.target.value }))}
                    placeholder="+977…"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
                <p className={secLabel}>Payout wallets (locked when verified)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600">eSewa</div>
                      <div className="text-[10px] text-zinc-600">{esewaLocked ? "Verified" : payoutDraft.esewaEnabled ? "Enabled" : "Disabled"}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!isEditing || esewaLocked}
                      onClick={() => setPayoutDraft((d) => ({ ...d, esewaEnabled: !d.esewaEnabled }))}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        payoutDraft.esewaEnabled ? "border-orange-500/40 bg-transparent text-orange-400 shadow-[inset_0_0_8px_rgba(249,115,22,0.15)] hover:border-orange-500/60 hover:bg-orange-500/10 hover:shadow-[inset_0_0_12px_rgba(249,115,22,0.3)]" : "border-white/20 bg-transparent text-zinc-500 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.1)]"
                      }`}
                    >
                      {payoutDraft.esewaEnabled ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Khalti</div>
                      <div className="text-[10px] text-zinc-600">{khaltiLocked ? "Verified" : payoutDraft.khaltiEnabled ? "Enabled" : "Disabled"}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!isEditing || khaltiLocked}
                      onClick={() => setPayoutDraft((d) => ({ ...d, khaltiEnabled: !d.khaltiEnabled }))}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        payoutDraft.khaltiEnabled ? "border-orange-500/40 bg-transparent text-orange-400 shadow-[inset_0_0_8px_rgba(249,115,22,0.15)] hover:border-orange-500/60 hover:bg-orange-500/10 hover:shadow-[inset_0_0_12px_rgba(249,115,22,0.3)]" : "border-white/20 bg-transparent text-zinc-500 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.1)]"
                      }`}
                    >
                      {payoutDraft.khaltiEnabled ? "On" : "Off"}
                    </button>
                  </div>

                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">eSewa wallet id</div>
                    <input
                      className={input}
                      disabled={!isEditing || esewaLocked}
                      value={payoutDraft.esewaWalletId}
                      onChange={(e) => setPayoutDraft((d) => ({ ...d, esewaWalletId: e.target.value }))}
                      placeholder="Wallet id"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">eSewa account name</div>
                    <input
                      className={input}
                      disabled={!isEditing || esewaLocked}
                      value={payoutDraft.esewaAccountName}
                      onChange={(e) => setPayoutDraft((d) => ({ ...d, esewaAccountName: e.target.value }))}
                      placeholder="Account name"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Khalti wallet id</div>
                    <input
                      className={input}
                      disabled={!isEditing || khaltiLocked}
                      value={payoutDraft.khaltiWalletId}
                      onChange={(e) => setPayoutDraft((d) => ({ ...d, khaltiWalletId: e.target.value }))}
                      placeholder="Wallet id"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Khalti account name</div>
                    <input
                      className={input}
                      disabled={!isEditing || khaltiLocked}
                      value={payoutDraft.khaltiAccountName}
                      onChange={(e) => setPayoutDraft((d) => ({ ...d, khaltiAccountName: e.target.value }))}
                      placeholder="Account name"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {profile && tab === "checkinLocations" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={card}>
            <p className={secLabel}>Location (locked after approval)</p>
            {locationLocked && (
              <div className="mb-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-[11px] text-orange-200/90">
                This section is locked because your gym is approved.
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Address line</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.addressLine}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, addressLine: e.target.value }))}
                  placeholder="Street / area"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">City</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.city}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Country</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.country}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, country: e.target.value }))}
                  placeholder="Country"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Postal code</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.postalCode}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, postalCode: e.target.value }))}
                  placeholder="Postal"
                />
              </div>
              <div />
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Latitude</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.latitude}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, latitude: e.target.value }))}
                  placeholder="27.7172"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Longitude</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.longitude}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, longitude: e.target.value }))}
                  placeholder="85.3240"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Opens at</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.opensAt}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, opensAt: e.target.value }))}
                  placeholder="06:00"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Closes at</div>
                <input
                  className={input}
                  disabled={locationLocked || !isEditing}
                  value={locationDraft.closesAt}
                  onChange={(e) => setLocationDraft((d) => ({ ...d, closesAt: e.target.value }))}
                  placeholder="22:00"
                />
              </div>
            </div>
          </div>

          <div className={card}>
            <p className={secLabel}>Check-in settings (read-only)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Check-in enabled</div>
                <input className={input} value={profile.checkInEnabled ? "Enabled" : "Disabled"} disabled />
              </div>
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Minimum access tier</div>
                <input className={input} value={profile.minimumAccessTier ?? "—"} disabled />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Allowed check-in radius (meters)</div>
                <input className={input} value={profile.allowedCheckInRadiusMeters ?? "—"} disabled />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-zinc-600">
              These settings are managed by FitPal admin review to prevent access issues.
            </div>
          </div>
        </div>
      )}

      {profile && tab === "documents" && (
        <div className="space-y-4">
          <div className={card}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={secLabel}>Documents</p>
                <p className="text-[11px] text-zinc-600">Approved documents are locked and cannot be replaced.</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={docType} onValueChange={(v) => setDocType(v as GymDocumentType)}>
                  <SelectTrigger className="h-[34px] min-w-[220px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[11px] font-bold text-white focus:ring-orange-500/30">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.08] bg-[#0a0a0a] text-white">
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-[11px] focus:bg-white/[0.06]">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {docsQ.isError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-200">
                {getApiErrorMessage(docsQ.error)}
              </div>
            )}

            {(docsQ.data ?? []).length === 0 && !docsQ.isLoading && (
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 text-[11px] text-zinc-600">
                No documents uploaded yet.
              </div>
            )}

            {(docsQ.data ?? []).map((d) => {
              const locked = d.status === "APPROVED";
              return (
                <div
                  key={d.documentId}
                  className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.055] bg-[#0a0a0a] p-3 transition-colors hover:border-orange-500/15"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/[0.08]">
                    <FileText className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{DOC_TYPES.find((t) => t.value === d.documentType)?.label ?? d.documentType}</div>
                    <div className="text-[10px] text-zinc-600">Uploaded {new Date(d.createdAt).toLocaleDateString()}</div>
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-block text-[10px] font-bold text-orange-500 hover:underline"
                    >
                      View
                    </a>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                      d.status === "APPROVED"
                        ? "border-green-400/20 bg-green-400/10 text-green-400"
                        : d.status === "REJECTED"
                          ? "border-red-400/20 bg-red-400/10 text-red-400"
                          : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400"
                    }`}
                  >
                    {d.status.replace(/_/g, " ")}
                  </span>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setDocDialogType(d.documentType);
                        setDocDialogReplaceId(d.documentId);
                        setDocDialogOpen(true);
                      }}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed ${
                        locked
                          ? "border-white/10 bg-transparent text-zinc-700 shadow-none"
                          : "border-white/20 bg-transparent text-zinc-400 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.1)]"
                      }`}
                      title={locked ? "Approved documents are locked" : "Replace document"}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      disabled={locked || docDeleteMut.isPending}
                      onClick={() => void docDeleteMut.mutateAsync(d.documentId)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] transition-all hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
                      title={locked ? "Approved documents are locked" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {profile && tab === "photos" && (
        <div className={card}>
          <p className={secLabel}>Photos</p>
          <p className="mb-3 text-[11px] text-zinc-600">Photos stay editable even after approval.</p>

          {photosQ.isError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-200">
              {getApiErrorMessage(photosQ.error)}
            </div>
          )}

          {(photosQ.data ?? []).length === 0 && !photosQ.isLoading && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 text-[11px] text-zinc-600">
              No photos yet. Add a few to improve your listing.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(photosQ.data ?? []).map((p) => (
              <PhotoCard
                key={p.photoId}
                photo={p}
                busy={photoDeleteMut.isPending || photoUpdateMut.isPending}
                onDelete={() => void photoDeleteMut.mutateAsync(p.photoId)}
                onSetCover={() => void photoUpdateMut.mutateAsync({ photoId: p.photoId, payload: { cover: true } })}
                onCaption={(caption) => void photoUpdateMut.mutateAsync({ photoId: p.photoId, payload: { caption } })}
              />
            ))}
          </div>
        </div>
      )}

      {profile && isEditableTab && isEditing && (
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={cancelEditing}
            disabled={savePending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 shadow-[inset_0_0_12px_rgba(255,255,255,0.05)] transition-all hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_16px_rgba(255,255,255,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveActiveTab()}
            disabled={loading || isMutating || !canEditCurrentTab}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      )}
    </div>
  );
};

function PhotoCard({
  photo,
  busy,
  onDelete,
  onSetCover,
  onCaption,
}: {
  photo: GymPhotoResponse;
  busy: boolean;
  onDelete: () => void;
  onSetCover: () => void;
  onCaption: (caption: string) => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0a]">
      <div className="relative">
        <img src={photo.photoUrl} alt={photo.caption ?? "Gym photo"} className="h-[170px] w-full object-cover" />
        {photo.cover && (
          <span className="absolute left-2 top-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-500">
            Cover
          </span>
        )}
        <div className="absolute right-2 top-2 flex gap-2">
          {!photo.cover && (
            <button
              type="button"
              onClick={onSetCover}
              disabled={busy}
              className="cursor-pointer rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] backdrop-blur transition-all hover:border-white/40 hover:bg-black/80 hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Set as cover"
            >
              Cover
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] backdrop-blur transition-all hover:border-white/40 hover:bg-black/80 hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">Caption</div>
        <input
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-orange-500/40"
          value={caption}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCaption(e.target.value)}
          placeholder="Optional"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={busy || caption.trim() === (photo.caption ?? "").trim()}
            onClick={() => onCaption(caption)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-orange-500/40 bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-400 shadow-[inset_0_0_8px_rgba(249,115,22,0.15)] transition-all hover:border-orange-500/60 hover:bg-orange-500/10 hover:shadow-[inset_0_0_12px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default GymProfilePage;
