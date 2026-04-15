import { getApiData, postApiData } from "@/shared/api/client";
import type {
  GymCheckInAnalyticsResponse,
  GymCheckInPage,
  GymCheckInSearchParams,
  GymDoorDeviceCredentialResponse,
  GymDoorDeviceProvisionResponse,
  GymDoorDeviceResponse,
  GymQrCodeResponse,
  GymTodayCheckInResponse,
} from "@/features/gym-dashboard/gym-checkins.model";

export async function getGymTodayCheckInsApi(): Promise<GymTodayCheckInResponse[]> {
  return getApiData<GymTodayCheckInResponse[]>("/gyms/me/check-ins/today");
}

export async function getGymQrCodeApi(): Promise<GymQrCodeResponse> {
  return getApiData<GymQrCodeResponse>("/gyms/me/check-ins/qr");
}

export async function rotateGymQrCodeApi(): Promise<GymQrCodeResponse> {
  return postApiData<GymQrCodeResponse>("/gyms/me/check-ins/qr/rotate");
}

export async function getGymCheckInAnalyticsApi(): Promise<GymCheckInAnalyticsResponse> {
  return getApiData<GymCheckInAnalyticsResponse>("/gyms/me/check-ins/analytics");
}

export async function getGymCheckInsApi(params?: GymCheckInSearchParams): Promise<GymCheckInPage> {
  return getApiData<GymCheckInPage>("/gyms/me/check-ins", {
    params,
    paramsSerializer: (p) => {
      const qp = new URLSearchParams();
      Object.entries(p ?? {}).forEach(([k, v]) => {
        if (v == null) return;
        if (Array.isArray(v)) {
          v.forEach((x) => qp.append(k, String(x)));
        } else {
          qp.append(k, String(v));
        }
      });
      return qp.toString();
    },
  });
}

export async function getGymDoorDeviceApi(): Promise<GymDoorDeviceResponse> {
  return getApiData<GymDoorDeviceResponse>("/gyms/me/door-device");
}

export async function provisionGymDoorDeviceApi(): Promise<GymDoorDeviceProvisionResponse> {
  return postApiData<GymDoorDeviceProvisionResponse>("/gyms/me/door-device/provision");
}

export async function rotateGymDoorDeviceSecretApi(): Promise<GymDoorDeviceCredentialResponse> {
  return postApiData<GymDoorDeviceCredentialResponse>("/gyms/me/door-device/rotate-secret");
}

export async function manualUnlockGymDoorApi(): Promise<void> {
  await postApiData("/gyms/me/door-device/manual-unlock");
}

export async function testUnlockGymDoorApi(): Promise<void> {
  await manualUnlockGymDoorApi();
}
