import { getApiData, postApiData } from "@/shared/api/client";
import type { PageResponse } from "@/shared/api/model";
import type {
  EsewaConfirmPaymentRequest,
  EsewaFailurePaymentRequest,
  EsewaInitiatePaymentRequest,
  EsewaInitiatePaymentResponse,
  EsewaLookupPaymentRequest,
  KhaltiInitiatePaymentRequest,
  KhaltiInitiatePaymentResponse,
  KhaltiLookupPaymentRequest,
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
  return postApiData<EsewaInitiatePaymentResponse>("/payments/esewa/initiate", payload);
}

/** POST /api/payments/khalti/initiate */
export async function initiateKhaltiPaymentApi(
  payload: KhaltiInitiatePaymentRequest
): Promise<KhaltiInitiatePaymentResponse> {
  return postApiData<KhaltiInitiatePaymentResponse>("/payments/khalti/initiate", payload);
}

/** POST /api/payments/esewa/confirm */
export async function confirmEsewaPaymentApi(
  payload: EsewaConfirmPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  return postApiData<PaymentAttemptStatusResponse>("/payments/esewa/confirm", payload);
}

/** POST /api/payments/esewa/failure */
export async function markEsewaPaymentFailureApi(
  payload: EsewaFailurePaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  return postApiData<PaymentAttemptStatusResponse>("/payments/esewa/failure", payload);
}

/** POST /api/payments/esewa/lookup */
export async function lookupEsewaPaymentApi(
  payload: EsewaLookupPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  return postApiData<PaymentAttemptStatusResponse>("/payments/esewa/lookup", payload);
}

/** POST /api/payments/khalti/lookup */
export async function lookupKhaltiPaymentApi(
  payload: KhaltiLookupPaymentRequest
): Promise<PaymentAttemptStatusResponse> {
  return postApiData<PaymentAttemptStatusResponse>("/payments/khalti/lookup", payload);
}

/** GET /api/users/me/payments/history */
export async function getMyPaymentHistoryApi(
  request?: UserPaymentHistorySearchRequest
): Promise<PageResponse<UserPaymentHistoryItemResponse>> {
  return getApiData<PageResponse<UserPaymentHistoryItemResponse>>(
    "/users/me/payments/history",
    { params: buildPaymentHistoryParams(request) }
  );
}

/** GET /api/users/me/payments/history/summary */
export async function getMyPaymentHistorySummaryApi(
  request?: UserPaymentHistorySearchRequest
): Promise<UserPaymentHistorySummaryResponse> {
  return getApiData<UserPaymentHistorySummaryResponse>(
    "/users/me/payments/history/summary",
    { params: buildPaymentHistoryParams(request) }
  );
}
