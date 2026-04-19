import type { ReactNode } from "react";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  GymDocumentResponse,
  GymPhotoResponse,
  GymProfileResponse,
} from "@/features/profile/model";
import { renderWithProviders } from "@/test/test-utils";

const gymSetupMocks = vi.hoisted(() => ({
  getMyGymProfileApi: vi.fn(),
  getMyGymDocumentsApi: vi.fn(),
  getMyGymPhotosApi: vi.fn(),
  patchGymBasicsStepApi: vi.fn(),
  patchGymLocationStepApi: vi.fn(),
  patchGymPayoutStepApi: vi.fn(),
  submitGymReviewSubmissionApi: vi.fn(),
  requestGymRegisteredEmailVerificationApi: vi.fn(),
  confirmGymRegisteredEmailVerificationApi: vi.fn(),
  deleteGymLogoApi: vi.fn(),
  deleteUploadedAssetApi: vi.fn(),
  deleteGymDocumentApi: vi.fn(),
  deleteGymPhotoApi: vi.fn(),
  createGymPhotoApi: vi.fn(),
  uploadDocumentFileApi: vi.fn(),
  uploadGymLogoApi: vi.fn(),
  uploadImageFileApi: vi.fn(),
  updateGymPhotoApi: vi.fn(),
  upsertGymDocumentApi: vi.fn(),
  useAuthState: vi.fn(),
  updateOnboardingStatus: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  otpCountdown: {
    isActive: false,
    formattedTime: "05:00",
    start: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock("@/features/profile/api", () => ({
  getMyGymProfileApi: gymSetupMocks.getMyGymProfileApi,
  getMyGymDocumentsApi: gymSetupMocks.getMyGymDocumentsApi,
  getMyGymPhotosApi: gymSetupMocks.getMyGymPhotosApi,
  patchGymBasicsStepApi: gymSetupMocks.patchGymBasicsStepApi,
  patchGymLocationStepApi: gymSetupMocks.patchGymLocationStepApi,
  patchGymPayoutStepApi: gymSetupMocks.patchGymPayoutStepApi,
  submitGymReviewSubmissionApi: gymSetupMocks.submitGymReviewSubmissionApi,
  requestGymRegisteredEmailVerificationApi:
    gymSetupMocks.requestGymRegisteredEmailVerificationApi,
  confirmGymRegisteredEmailVerificationApi:
    gymSetupMocks.confirmGymRegisteredEmailVerificationApi,
  deleteGymLogoApi: gymSetupMocks.deleteGymLogoApi,
  deleteUploadedAssetApi: gymSetupMocks.deleteUploadedAssetApi,
  deleteGymDocumentApi: gymSetupMocks.deleteGymDocumentApi,
  deleteGymPhotoApi: gymSetupMocks.deleteGymPhotoApi,
  createGymPhotoApi: gymSetupMocks.createGymPhotoApi,
  uploadDocumentFileApi: gymSetupMocks.uploadDocumentFileApi,
  uploadGymLogoApi: gymSetupMocks.uploadGymLogoApi,
  uploadImageFileApi: gymSetupMocks.uploadImageFileApi,
  updateGymPhotoApi: gymSetupMocks.updateGymPhotoApi,
  upsertGymDocumentApi: gymSetupMocks.upsertGymDocumentApi,
}));

vi.mock("@/features/auth/hooks", () => ({
  useAuthState: () => gymSetupMocks.useAuthState(),
}));

vi.mock("@/features/auth/store", () => ({
  authStore: {
    updateOnboardingStatus: gymSetupMocks.updateOnboardingStatus,
  },
}));

vi.mock("@/shared/layout/dashboard-shell", () => ({
  DefaultLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}));

vi.mock("@/shared/hooks/useOtpCountdown", () => ({
  useOtpCountdown: () => gymSetupMocks.otpCountdown,
}));

vi.mock("sonner", () => ({
  toast: gymSetupMocks.toast,
}));

import GymProfileSetup from "@/features/profile/screens/GymProfileSetup";

const buildProfile = (
  overrides: Partial<GymProfileResponse> = {},
): GymProfileResponse => ({
  accountId: 11,
  gymId: 22,
  registeredEmail: "gym-owner@fitpal.com",
  registeredEmailVerified: true,
  gymName: "FitPal Arena",
  gymType: "Commercial",
  minimumAccessTier: "PRO",
  checkInEnabled: true,
  checkInAccessMode: "MANUAL",
  allowedCheckInRadiusMeters: 150,
  establishedAt: 2021,
  registrationNo: "REG-2081-22",
  maxCapacity: 180,
  onboardingStep: 0,
  profileCompleted: false,
  approvalStatus: "DRAFT",
  submittedForReview: false,
  approved: false,
  dashboardAccessible: false,
  addressLine: "Durbar Marg",
  city: "Kathmandu",
  country: "Nepal",
  postalCode: "44600",
  latitude: 27.7172,
  longitude: 85.324,
  phoneNo: "9812345678",
  contactEmail: "contact@fitpalarena.com",
  description: "Strength and conditioning gym",
  logoUrl: null,
  logoPublicId: null,
  logoResourceType: null,
  websiteUrl: "https://fitpalarena.com",
  opensAt: "06:00",
  closesAt: "21:00",
  esewaWalletId: "9812345678",
  esewaAccountName: "FitPal Arena",
  esewaWalletVerified: false,
  khaltiWalletId: null,
  khaltiAccountName: null,
  khaltiWalletVerified: false,
  documentCount: 2,
  maxDocuments: 6,
  requiredDocumentsUploaded: true,
  readyForReviewSubmission: true,
  ...overrides,
});

const buildDocuments = (): GymDocumentResponse[] => [
  {
    documentId: 1,
    documentType: "REGISTRATION_CERTIFICATE",
    status: "APPROVED",
    publicId: "doc-reg",
    resourceType: "image",
    fileUrl: "https://cdn.fitpal.com/doc-reg.png",
    createdAt: "2026-04-01T00:00:00Z",
  },
  {
    documentId: 2,
    documentType: "LICENSE",
    status: "APPROVED",
    publicId: "doc-license",
    resourceType: "image",
    fileUrl: "https://cdn.fitpal.com/doc-license.png",
    createdAt: "2026-04-01T00:00:00Z",
  },
];

const buildPhotos = (): GymPhotoResponse[] => [
  {
    photoId: 5,
    publicId: "photo-cover",
    resourceType: "image",
    photoUrl: "https://cdn.fitpal.com/photo-cover.png",
    caption: "Main floor",
    displayOrder: 0,
    cover: true,
    createdAt: "2026-04-01T00:00:00Z",
  },
];

const renderGymSetup = (route = "/gym-profile-setup") =>
  renderWithProviders(
    <Routes>
      <Route path="/gym-profile-setup" element={<GymProfileSetup />} />
    </Routes>,
    { route },
  );

const seedSetup = ({
  profile = buildProfile(),
  documents = buildDocuments(),
  photos = buildPhotos(),
}: {
  profile?: GymProfileResponse;
  documents?: GymDocumentResponse[];
  photos?: GymPhotoResponse[];
} = {}) => {
  gymSetupMocks.getMyGymProfileApi.mockResolvedValue(profile);
  gymSetupMocks.getMyGymDocumentsApi.mockResolvedValue(documents);
  gymSetupMocks.getMyGymPhotosApi.mockResolvedValue(photos);
};

describe("GymProfileSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gymSetupMocks.useAuthState.mockReturnValue({
      accessToken: "gym-token",
      email: "gym-owner@fitpal.com",
      role: "GYM",
      providers: ["LOCAL"],
      profileCompleted: false,
      emailVerified: true,
      submittedForReview: false,
      approved: false,
      hasSubscription: false,
      hasActiveSubscription: false,
      hasDashboardAccess: false,
    });
    seedSetup();
    gymSetupMocks.patchGymBasicsStepApi.mockResolvedValue(
      buildProfile({ onboardingStep: 1 }),
    );
    gymSetupMocks.patchGymLocationStepApi.mockResolvedValue(
      buildProfile({ onboardingStep: 2 }),
    );
    gymSetupMocks.patchGymPayoutStepApi.mockResolvedValue(
      buildProfile({ onboardingStep: 3 }),
    );
    gymSetupMocks.submitGymReviewSubmissionApi.mockResolvedValue(
      buildProfile({
        onboardingStep: 5,
        approvalStatus: "PENDING_REVIEW",
        submittedForReview: true,
        profileCompleted: true,
      }),
    );
  });

  it("progresses through gym onboarding step flow with saved state refreshes", async () => {
    const user = userEvent.setup();

    renderGymSetup();

    expect(await screen.findByDisplayValue("FitPal Arena")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    await waitFor(() => {
      expect(gymSetupMocks.patchGymBasicsStepApi).toHaveBeenCalledWith({
        gymName: "FitPal Arena",
        gymType: "Commercial",
        establishedAt: 2021,
        registrationNo: "REG-2081-22",
        maxCapacity: 180,
      });
    });
    expect(await screen.findByText("Address Details")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    await waitFor(() => {
      expect(gymSetupMocks.patchGymLocationStepApi).toHaveBeenCalledWith({
        addressLine: "Durbar Marg",
        city: "Kathmandu",
        country: "Nepal",
        postalCode: "44600",
        latitude: 27.7172,
        longitude: 85.324,
        phoneNo: "9812345678",
        contactEmail: "contact@fitpalarena.com",
        description: "Strength and conditioning gym",
        websiteUrl: "https://fitpalarena.com",
        opensAt: "06:00",
        closesAt: "21:00",
      });
    });
    expect(await screen.findByText("eSewa")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    await waitFor(() => {
      expect(gymSetupMocks.patchGymPayoutStepApi).toHaveBeenCalledWith({
        esewaEnabled: true,
        esewaWalletId: "9812345678",
        esewaAccountName: "FitPal Arena",
        khaltiEnabled: false,
        khaltiWalletId: undefined,
        khaltiAccountName: undefined,
      });
    });
    expect(
      await screen.findByText("Verification Documents"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    expect(await screen.findByText("Please Check Again")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /submit for review/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /submit for review/i }));
    await waitFor(() => {
      expect(gymSetupMocks.submitGymReviewSubmissionApi).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Pending Review")).toBeInTheDocument();
  });

  it("surfaces gym onboarding validation rendering for hours, coordinates, payout metadata, and upload requirements", async () => {
    const user = userEvent.setup();

    seedSetup({
      profile: buildProfile({
        onboardingStep: 1,
      }),
    });
    const view = renderGymSetup();

    expect(await screen.findByText("Address Details")).toBeInTheDocument();

    const timeInputs = view.container.querySelectorAll('input[type="time"]');
    expect(timeInputs).toHaveLength(2);
    fireEvent.change(timeInputs[0]!, { target: { value: "18:00" } });
    fireEvent.change(timeInputs[1]!, { target: { value: "06:00" } });

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    expect(
      await screen.findByText("Closing time must be after opening time."),
    ).toBeInTheDocument();
    expect(gymSetupMocks.patchGymLocationStepApi).not.toHaveBeenCalled();

    cleanup();
    vi.clearAllMocks();
    gymSetupMocks.useAuthState.mockReturnValue({
      accessToken: "gym-token",
      email: "gym-owner@fitpal.com",
      role: "GYM",
      providers: ["LOCAL"],
      profileCompleted: false,
      emailVerified: true,
      submittedForReview: false,
      approved: false,
      hasSubscription: false,
      hasActiveSubscription: false,
      hasDashboardAccess: false,
    });
    seedSetup({
      profile: buildProfile({ onboardingStep: 1 }),
    });
    gymSetupMocks.patchGymLocationStepApi.mockRejectedValue(
      new Error("Coordinates rejected by API"),
    );

    renderGymSetup();

    expect(await screen.findByDisplayValue("Durbar Marg")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    await waitFor(() => {
      expect(gymSetupMocks.patchGymLocationStepApi).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByDisplayValue("Durbar Marg")).toBeInTheDocument();
    expect(screen.queryByText("eSewa")).not.toBeInTheDocument();

    cleanup();
    vi.clearAllMocks();
    gymSetupMocks.useAuthState.mockReturnValue({
      accessToken: "gym-token",
      email: "gym-owner@fitpal.com",
      role: "GYM",
      providers: ["LOCAL"],
      profileCompleted: false,
      emailVerified: true,
      submittedForReview: false,
      approved: false,
      hasSubscription: false,
      hasActiveSubscription: false,
      hasDashboardAccess: false,
    });
    seedSetup({
      profile: buildProfile({
        onboardingStep: 2,
        esewaWalletId: null,
        esewaAccountName: null,
        khaltiWalletId: null,
        khaltiAccountName: null,
      }),
    });

    renderGymSetup();

    await user.click(await screen.findByRole("button", { name: /save and continue/i }));
    expect(gymSetupMocks.patchGymPayoutStepApi).not.toHaveBeenCalled();
    expect(screen.getByText("How payouts work")).toBeInTheDocument();
    expect(screen.queryByText("Verification Documents")).not.toBeInTheDocument();

    cleanup();
    vi.clearAllMocks();
    gymSetupMocks.useAuthState.mockReturnValue({
      accessToken: "gym-token",
      email: "gym-owner@fitpal.com",
      role: "GYM",
      providers: ["LOCAL"],
      profileCompleted: false,
      emailVerified: true,
      submittedForReview: false,
      approved: false,
      hasSubscription: false,
      hasActiveSubscription: false,
      hasDashboardAccess: false,
    });
    seedSetup({
      profile: buildProfile({
        onboardingStep: 3,
        documentCount: 0,
        requiredDocumentsUploaded: false,
        readyForReviewSubmission: false,
      }),
      documents: [],
      photos: [],
    });

    renderGymSetup();

    await user.click(await screen.findByRole("button", { name: /save and continue/i }));
    expect(await screen.findByText("Verification Documents")).toBeInTheDocument();
    expect(
      screen.getByText("Drop photos here or click to browse"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit for review/i }),
    ).not.toBeInTheDocument();
  });

  it("renders draft, pending review, rejected, and approved gym review statuses safely", async () => {
    seedSetup({
      profile: buildProfile({
        onboardingStep: 0,
        approvalStatus: "DRAFT",
      }),
    });
    renderGymSetup();
    expect(await screen.findByDisplayValue("FitPal Arena")).toBeInTheDocument();

    cleanup();
    seedSetup({
      profile: buildProfile({
        onboardingStep: 5,
        approvalStatus: "PENDING_REVIEW",
        submittedForReview: true,
      }),
    });
    renderGymSetup();
    expect(await screen.findByText("Pending Review")).toBeInTheDocument();

    cleanup();
    seedSetup({
      profile: buildProfile({
        onboardingStep: 4,
        approvalStatus: "REJECTED",
        submittedForReview: true,
      }),
    });
    renderGymSetup();
    expect(
      await screen.findByText("Application Rejected — Editing Enabled"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resubmit for review/i }),
    ).toBeInTheDocument();

    cleanup();
    seedSetup({
      profile: buildProfile({
        onboardingStep: 5,
        approvalStatus: "APPROVED",
        submittedForReview: true,
        approved: true,
        dashboardAccessible: true,
      }),
    });
    renderGymSetup();
    expect(await screen.findByText("Gym Approved")).toBeInTheDocument();
  });

  it("shows a document-specific format error when an unsupported document file is selected", async () => {
    const user = userEvent.setup();

    seedSetup({
      profile: buildProfile({
        onboardingStep: 3,
        documentCount: 0,
        requiredDocumentsUploaded: false,
        readyForReviewSubmission: false,
      }),
      documents: [],
      photos: [],
    });

    const view = renderGymSetup();

    expect(await screen.findByText("Verification Documents")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /click to upload/i })[0]!);

    const documentInput = view.container.querySelector(
      'input[type="file"][accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"]',
    ) as HTMLInputElement | null;

    expect(documentInput).not.toBeNull();

    fireEvent.change(documentInput!, {
      target: {
        files: [new File(["bad"], "unsupported.gif", { type: "image/gif" })],
      },
    });

    expect(await screen.findByText(
      "Invalid document format. Upload PDF, DOC, DOCX, JPG, PNG, or WEBP files only.",
    )).toBeInTheDocument();
    expect(gymSetupMocks.uploadDocumentFileApi).not.toHaveBeenCalled();
  });

  it("shows an image format error for unsupported files in the photo uploader", async () => {
    seedSetup({
      profile: buildProfile({
        onboardingStep: 3,
        documentCount: 0,
        requiredDocumentsUploaded: false,
        readyForReviewSubmission: false,
      }),
      documents: [],
      photos: [],
    });

    const view = renderGymSetup();

    expect(await screen.findByRole("button", {
      name: /drop photos here or click to browse/i,
    })).toBeInTheDocument();

    const photoInput = view.container.querySelector(
      'input[type="file"][accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"]',
    ) as HTMLInputElement | null;

    expect(photoInput).not.toBeNull();

    fireEvent.change(photoInput!, {
      target: {
        files: [new File(["bad"], "unsupported.gif", { type: "image/gif" })],
      },
    });

    expect(await screen.findByText(
      "Invalid image format. Upload JPG, PNG, or WEBP files only.",
    )).toBeInTheDocument();
    expect(gymSetupMocks.uploadImageFileApi).not.toHaveBeenCalled();
  });
});
