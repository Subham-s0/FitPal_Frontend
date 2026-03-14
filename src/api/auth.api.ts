import apiClient from "./client";
import type {
  LoginRequest,
  RegisterUserRequest,
  RegisterGymRequest,
  AuthResponse,
} from "@/models/auth.model";

/** POST /api/auth/login */
export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/login", data);
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
