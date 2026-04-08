import apiClient from "@/shared/api/client";
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
  const response = await apiClient.get<GymTodayCheckInResponse[]>("/gyms/me/check-ins/today");
  return response.data;
}

export async function getGymQrCodeApi(): Promise<GymQrCodeResponse> {
  const response = await apiClient.get<GymQrCodeResponse>("/gyms/me/check-ins/qr");
  return response.data;
}

export async function rotateGymQrCodeApi(): Promise<GymQrCodeResponse> {
  const response = await apiClient.post<GymQrCodeResponse>("/gyms/me/check-ins/qr/rotate");
  return response.data;
}

export async function getGymCheckInAnalyticsApi(): Promise<GymCheckInAnalyticsResponse> {
  const response = await apiClient.get<GymCheckInAnalyticsResponse>("/gyms/me/check-ins/analytics");
  return response.data;
}

export async function getGymCheckInsApi(params?: GymCheckInSearchParams): Promise<GymCheckInPage> {
  const response = await apiClient.get<GymCheckInPage>("/gyms/me/check-ins", {
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
  return response.data;
}

export async function getGymDoorDeviceApi(): Promise<GymDoorDeviceResponse> {
  const response = await apiClient.get<GymDoorDeviceResponse>("/gyms/me/door-device");
  return response.data;
}

export async function provisionGymDoorDeviceApi(): Promise<GymDoorDeviceProvisionResponse> {
  const response = await apiClient.post<GymDoorDeviceProvisionResponse>("/gyms/me/door-device/provision");
  return response.data;
}

export async function rotateGymDoorDeviceSecretApi(): Promise<GymDoorDeviceCredentialResponse> {
  const response = await apiClient.post<GymDoorDeviceCredentialResponse>("/gyms/me/door-device/rotate-secret");
  return response.data;
}

export async function manualUnlockGymDoorApi(): Promise<void> {
  await apiClient.post("/gyms/me/door-device/manual-unlock");
}

export async function testUnlockGymDoorApi(): Promise<void> {
  await manualUnlockGymDoorApi();
}
