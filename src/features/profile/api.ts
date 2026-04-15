import { deleteApiData, getApiData, patchApiData, postApiData } from "@/shared/api/client";
import type { OtpDispatchResponse } from "@/features/auth/model";
import type {
  ChangePasswordRequest,
  ConfirmEmailVerificationRequest,
  CreateGymPhotoRequest,
  DeleteAssetRequest,
  DeleteAssetResponse,
  DocumentUploadResponse,
  GymDocumentResponse,
  GymPhotoResponse,
  GymProfileResponse,
  GymProfileSetupStatusResponse,
  ProfileGoalsUpdateRequest,
  ProfileGoalsUpdateResponse,
  ProfileImageUpdateRequest,
  ProfileImageUpdateResponse,
  ProfileInfoUpdateRequest,
  ProfileInfoUpdateResponse,
  UpdateGymBasicsStepRequest,
  UpdateGymLocationStepRequest,
  UpdateGymPayoutStepRequest,
  UpdateGymPhotoRequest,
  UpdateUserProfileDetailsRequest,
  UpsertGymDocumentRequest,
  ProfileSetupStatusResponse,
  UpdateUserOnboardingRequest,
  UserProfileResponse,
} from "@/features/profile/model";

/** GET /api/users/me/profile */
export async function getMyProfileApi(): Promise<UserProfileResponse> {
  return getApiData<UserProfileResponse>("/users/me/profile");
}

/** GET /api/users/me/profile/setup-status */
export async function getProfileSetupStatusApi(): Promise<ProfileSetupStatusResponse> {
  return getApiData<ProfileSetupStatusResponse>("/users/me/profile/setup-status");
}

/** GET /api/gyms/me/profile */
export async function getMyGymProfileApi(): Promise<GymProfileResponse> {
  return getApiData<GymProfileResponse>("/gyms/me/profile");
}

/** GET /api/gyms/me/profile/setup-status */
export async function getGymProfileSetupStatusApi(): Promise<GymProfileSetupStatusResponse> {
  return getApiData<GymProfileSetupStatusResponse>("/gyms/me/profile/setup-status");
}

/** GET /api/gyms/me/profile/documents */
export async function getMyGymDocumentsApi(): Promise<GymDocumentResponse[]> {
  return getApiData<GymDocumentResponse[]>("/gyms/me/profile/documents");
}

/** GET /api/gyms/me/profile/photos */
export async function getMyGymPhotosApi(): Promise<GymPhotoResponse[]> {
  return getApiData<GymPhotoResponse[]>("/gyms/me/profile/photos");
}

/** POST /api/gyms/me/profile/logo */
export async function uploadGymLogoApi(file: File): Promise<GymProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return postApiData<GymProfileResponse>("/gyms/me/profile/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** DELETE /api/gyms/me/profile/logo */
export async function deleteGymLogoApi(): Promise<GymProfileResponse> {
  return deleteApiData<GymProfileResponse>("/gyms/me/profile/logo");
}

/** POST /api/gyms/me/profile/verify-registered-email */
export async function verifyGymRegisteredEmailApi(): Promise<GymProfileSetupStatusResponse> {
  return postApiData<GymProfileSetupStatusResponse>(
    "/gyms/me/profile/verify-registered-email"
  );
}

/** PATCH /api/users/me/profile */
export async function patchOnboardingProfileApi(
  payload: UpdateUserOnboardingRequest
): Promise<UserProfileResponse> {
  return patchApiData<UserProfileResponse>("/users/me/profile", payload);
}

/** PATCH /api/users/me/profile/details */
export async function patchMyProfileDetailsApi(
  payload: UpdateUserProfileDetailsRequest
): Promise<UserProfileResponse> {
  return patchApiData<UserProfileResponse>("/users/me/profile/details", payload);
}

/** POST /api/users/me/email-verification/request */
export async function requestMyEmailVerificationApi(): Promise<OtpDispatchResponse> {
  return postApiData<OtpDispatchResponse>("/users/me/email-verification/request");
}

/** POST /api/users/me/email-verification/confirm */
export async function confirmMyEmailVerificationApi(
  payload: ConfirmEmailVerificationRequest
): Promise<UserProfileResponse> {
  return postApiData<UserProfileResponse>("/users/me/email-verification/confirm", payload);
}

/** POST /api/users/me/password/change */
export async function changeMyPasswordApi(payload: ChangePasswordRequest): Promise<void> {
  await postApiData("/users/me/password/change", payload);
}

/** PATCH /api/gyms/me/profile/steps/basic */
export async function patchGymBasicsStepApi(
  payload: UpdateGymBasicsStepRequest
): Promise<GymProfileResponse> {
  return patchApiData<GymProfileResponse>("/gyms/me/profile/steps/basic", payload);
}

/** PATCH /api/gyms/me/profile/steps/location */
export async function patchGymLocationStepApi(
  payload: UpdateGymLocationStepRequest
): Promise<GymProfileResponse> {
  return patchApiData<GymProfileResponse>(
    "/gyms/me/profile/steps/location",
    payload
  );
}

/** PATCH /api/gyms/me/profile/steps/payout */
export async function patchGymPayoutStepApi(
  payload: UpdateGymPayoutStepRequest
): Promise<GymProfileResponse> {
  return patchApiData<GymProfileResponse>(
    "/gyms/me/profile/steps/payout",
    payload
  );
}

/** POST /api/gyms/me/profile/steps/review-submission */
export async function submitGymReviewSubmissionApi(): Promise<GymProfileResponse> {
  return postApiData<GymProfileResponse>(
    "/gyms/me/profile/steps/review-submission"
  );
}

/** POST /api/gyms/me/profile/documents */
export async function upsertGymDocumentApi(
  payload: UpsertGymDocumentRequest
): Promise<GymDocumentResponse> {
  return postApiData<GymDocumentResponse>("/gyms/me/profile/documents", payload);
}

/** DELETE /api/gyms/me/profile/documents/:documentId */
export async function deleteGymDocumentApi(documentId: number): Promise<void> {
  await deleteApiData(`/gyms/me/profile/documents/${documentId}`);
}

/** POST /api/gyms/me/profile/photos */
export async function createGymPhotoApi(
  payload: CreateGymPhotoRequest
): Promise<GymPhotoResponse> {
  return postApiData<GymPhotoResponse>("/gyms/me/profile/photos", payload);
}

/** PATCH /api/gyms/me/profile/photos/:photoId */
export async function updateGymPhotoApi(
  photoId: number,
  payload: UpdateGymPhotoRequest
): Promise<GymPhotoResponse> {
  return patchApiData<GymPhotoResponse>(`/gyms/me/profile/photos/${photoId}`, payload);
}

/** DELETE /api/gyms/me/profile/photos/:photoId */
export async function deleteGymPhotoApi(photoId: number): Promise<void> {
  await deleteApiData(`/gyms/me/profile/photos/${photoId}`);
}

/** POST /api/files/documents */
export async function uploadDocumentFileApi(
  file: File,
  folder?: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  return postApiData<DocumentUploadResponse>("/files/documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** POST /api/files/images */
export async function uploadImageFileApi(
  file: File,
  folder?: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  return postApiData<DocumentUploadResponse>("/files/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** DELETE /api/files/assets */
export async function deleteUploadedAssetApi(
  payload: DeleteAssetRequest
): Promise<DeleteAssetResponse> {
  return deleteApiData<DeleteAssetResponse>("/files/assets", {
    data: payload,
  });
}

/** POST /api/users/me/profile/image */
export async function uploadProfileImageApi(file: File): Promise<UserProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return postApiData<UserProfileResponse>("/users/me/profile/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** DELETE /api/users/me/profile/image */
export async function deleteProfileImageApi(): Promise<UserProfileResponse> {
  return deleteApiData<UserProfileResponse>("/users/me/profile/image");
}

/** PATCH /api/users/me/profile/image/metadata */
export async function updateProfileImageMetadataApi(
  payload: ProfileImageUpdateRequest
): Promise<ProfileImageUpdateResponse> {
  return patchApiData<ProfileImageUpdateResponse>(
    "/users/me/profile/image/metadata",
    payload
  );
}

/** PATCH /api/users/me/profile/info */
export async function updateProfileInfoApi(
  payload: ProfileInfoUpdateRequest
): Promise<ProfileInfoUpdateResponse> {
  return patchApiData<ProfileInfoUpdateResponse>(
    "/users/me/profile/info",
    payload
  );
}

/** PATCH /api/users/me/profile/goals */
export async function updateProfileGoalsApi(
  payload: ProfileGoalsUpdateRequest
): Promise<ProfileGoalsUpdateResponse> {
  return patchApiData<ProfileGoalsUpdateResponse>(
    "/users/me/profile/goals",
    payload
  );
}
