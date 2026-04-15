import apiClient from "@/shared/api/client";
import type {
  EsewaConfirmPaymentRequest,
  EsewaFailurePaymentRequest,
  EsewaInitiatePaymentRequest,
  EsewaInitiatePaymentResponse,
  EsewaLookupPaymentRequest,
  KhaltiInitiatePaymentRequest,
  KhaltiInitiatePaymentResponse,
  KhaltiLookupPaymentRequest,
  PageResponse,
  PaymentAttemptStatusResponse,
  UserPaymentHistoryItemResponse,
  UserPaymentHistorySearchRequest,
  UserPaymentHistorySummaryResponse,
} from "@/features/payment/model";

function buildPaymentHistoryParams(request?: UserPaymentHistorySearchRequest) {
  if (!request) {
    return undefined;
  }

  return {
    ...request,
    statuses: request.statuses?.length ? request.statuses.join(",") : undefined,
    paymentMethods: request.paymentMethods?.length ? request.paymentMethods.join(",") : undefined,
  };
}

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

/** POST /api/payments/esewa/lookup */
export async function lookupEsewaPaymentApi(
  payload: EsewaLookupPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  const response = await apiClient.post<PaymentAttemptStatusResponse>("/payments/esewa/lookup", payload);
  return response.data;
}

/** POST /api/payments/khalti/lookup */
export async function lookupKhaltiPaymentApi(
  payload: KhaltiLookupPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  const response = await apiClient.post<PaymentAttemptStatusResponse>("/payments/khalti/lookup", payload);
  return response.data;
}

/** GET /api/users/me/payments/history */
export async function getMyPaymentHistoryApi(
  request?: UserPaymentHistorySearchRequest
): Promise<PageResponse<UserPaymentHistoryItemResponse>> {
  const response = await apiClient.get<PageResponse<UserPaymentHistoryItemResponse>>(
    "/users/me/payments/history",
    { params: buildPaymentHistoryParams(request) }
  );
  return response.data;
}

/** GET /api/users/me/payments/history/summary */
export async function getMyPaymentHistorySummaryApi(
  request?: UserPaymentHistorySearchRequest
): Promise<UserPaymentHistorySummaryResponse> {
  const response = await apiClient.get<UserPaymentHistorySummaryResponse>(
    "/users/me/payments/history/summary",
    { params: buildPaymentHistoryParams(request) }
  );
  return response.data;
}
