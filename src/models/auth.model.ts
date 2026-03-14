import { z } from "zod";

// ── Request DTOs ──────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email must be valid"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const registerUserSchema = z
  .object({
    email: z.string().email("Email must be valid"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72),
    confirmPassword: z.string(),
    userName: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

export const registerGymSchema = z
  .object({
    email: z.string().email("Email must be valid"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72),
    confirmPassword: z.string(),
    gymName: z.string().min(1, "Gym name is required").max(100),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterGymRequest = z.infer<typeof registerGymSchema>;

// ── Response DTO ──────────────────────────────────────────────────────────

export interface AuthResponse {
  message: string;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  accountId: number;
  email: string;
  role: string;
  providers: string[];
  profileCompleted: boolean;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[];
  path: string;
}
