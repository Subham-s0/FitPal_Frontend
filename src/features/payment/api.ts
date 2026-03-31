import apiClient from "@/shared/api/client";
import type {
  EsewaConfirmPaymentRequest,
  EsewaFailurePaymentRequest,
  EsewaInitiatePaymentRequest,
  EsewaInitiatePaymentResponse,
  KhaltiInitiatePaymentRequest,
  KhaltiInitiatePaymentResponse,
  KhaltiLookupPaymentRequest,
  PaymentAttemptStatusResponse,
} from "@/features/payment/model";

/** POST /api/payments/esewa/initiate */
export async function initiateEsewaPaymentApi(
  payload: EsewaInitiatePaymentRequest
): Promise<EsewaInitiatePaymentResponse> {
  const response = await apiClient.post<EsewaInitiatePaymentResponse>("/payments/esewa/initiate", payload);
  return response.data;
}

/** POST /api/payments/khalti/initiate */
export async function initiateKhaltiPaymentApi(
  payload: KhaltiInitiatePaymentRequest
): Promise<KhaltiInitiatePaymentResponse> {
  const response = await apiClient.post<KhaltiInitiatePaymentResponse>("/payments/khalti/initiate", payload);
  return response.data;
}

/** POST /api/payments/esewa/confirm */
export async function confirmEsewaPaymentApi(
  payload: EsewaConfirmPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  const response = await apiClient.post<PaymentAttemptStatusResponse>("/payments/esewa/confirm", payload);
  return response.data;
}

/** POST /api/payments/esewa/failure */
export async function markEsewaPaymentFailureApi(
  payload: EsewaFailurePaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  const response = await apiClient.post<PaymentAttemptStatusResponse>("/payments/esewa/failure", payload);
  return response.data;
}

/** POST /api/payments/khalti/lookup */
export async function lookupKhaltiPaymentApi(
  payload: KhaltiLookupPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  const response = await apiClient.post<PaymentAttemptStatusResponse>("/payments/khalti/lookup", payload);
  return response.data;
}
