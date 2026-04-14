import apiClient from "@/shared/api/client";
import type {
  LoginRequest,
  RegisterUserRequest,
  RegisterGymRequest,
  AuthResponse,
  ForgotPasswordRequestOtpRequest,
  ForgotPasswordResetRequest,
  OtpDispatchResponse,
} from "@/features/auth/model";

/** POST /api/auth/login — members and gyms only (SUPERADMIN must use adminLoginApi) */
export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/login", data);
  return res.data;
}

/** POST /api/auth/admin/login — SUPERADMIN only */
export async function adminLoginApi(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/admin/login", data);
  return res.data;
}

/** POST /api/auth/register/user */
export async function registerUserApi(
  data: RegisterUserRequest
): Promise<AuthResponse> {
  // Backend doesn't expect confirmPassword — strip it
  const { confirmPassword: _, ...payload } = data;
  const res = await apiClient.post<AuthResponse>(
    "/auth/register/user",
    payload
  );
  return res.data;
}

/** POST /api/auth/register/gym */
export async function registerGymApi(
  data: RegisterGymRequest
): Promise<AuthResponse> {
  const { confirmPassword: _, ...payload } = data;
  const res = await apiClient.post<AuthResponse>("/auth/register/gym", payload);
  return res.data;
}

/** POST /api/auth/password/forgot/request-otp */
export async function requestForgotPasswordOtpApi(
  data: ForgotPasswordRequestOtpRequest
): Promise<OtpDispatchResponse> {
  const response = await apiClient.post<OtpDispatchResponse>("/auth/password/forgot/request-otp", data);
  return response.data;
}

/** POST /api/auth/password/forgot/reset */
export async function resetForgotPasswordApi(
  data: ForgotPasswordResetRequest
): Promise<void> {
  await apiClient.post("/auth/password/forgot/reset", data);
}
