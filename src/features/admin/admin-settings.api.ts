import apiClient from "@/shared/api/client";
import type {
  ApplicationRuleSummaryResponse,
  ApplicationRuleUpdateRequest,
  CmsFeatureResponse,
  CmsFeatureUpsertRequest,
  CmsTestimonialResponse,
  CmsTestimonialUpsertRequest,
  CmsHowToStepResponse,
  CmsHowToStepUpsertRequest,
  CmsFaqResponse,
  CmsFaqUpsertRequest,
  CmsStatResponse,
  CmsStatUpsertRequest,
  ExerciseEmbeddingIndexingResult,
  ExerciseEmbeddingStatusResponse,
} from "./admin-settings.model";

export async function getApplicationRulesApi(): Promise<ApplicationRuleSummaryResponse> {
  const response = await apiClient.get<ApplicationRuleSummaryResponse>("/admin/application-rules/summary");
  return response.data;
}

export async function updateApplicationRulesApi(payload: ApplicationRuleUpdateRequest): Promise<ApplicationRuleSummaryResponse> {
  const response = await apiClient.patch<ApplicationRuleSummaryResponse>("/admin/application-rules", payload);
  return response.data;
}

export async function getCmsFeaturesApi(): Promise<CmsFeatureResponse[]> {
  const response = await apiClient.get<CmsFeatureResponse[]>("/admin/cms/features");
  return response.data;
}

export async function createCmsFeatureApi(payload: CmsFeatureUpsertRequest): Promise<CmsFeatureResponse> {
  const response = await apiClient.post<CmsFeatureResponse>("/admin/cms/features", payload);
  return response.data;
}

export async function updateCmsFeatureApi(id: string, payload: CmsFeatureUpsertRequest): Promise<CmsFeatureResponse> {
  const response = await apiClient.patch<CmsFeatureResponse>(`/admin/cms/features/${id}`, payload);
  return response.data;
}

export async function deleteCmsFeatureApi(id: string): Promise<void> {
  await apiClient.delete(`/admin/cms/features/${id}`);
}

export async function getCmsTestimonialsApi(): Promise<CmsTestimonialResponse[]> {
  const response = await apiClient.get<CmsTestimonialResponse[]>("/admin/cms/testimonials");
  return response.data;
}

export async function createCmsTestimonialApi(payload: CmsTestimonialUpsertRequest): Promise<CmsTestimonialResponse> {
  const response = await apiClient.post<CmsTestimonialResponse>("/admin/cms/testimonials", payload);
  return response.data;
}

export async function updateCmsTestimonialApi(id: string, payload: CmsTestimonialUpsertRequest): Promise<CmsTestimonialResponse> {
  const response = await apiClient.patch<CmsTestimonialResponse>(`/admin/cms/testimonials/${id}`, payload);
  return response.data;
}

export async function deleteCmsTestimonialApi(id: string): Promise<void> {
  await apiClient.delete(`/admin/cms/testimonials/${id}`);
}

export async function getCmsHowToStepsApi(): Promise<CmsHowToStepResponse[]> {
  const response = await apiClient.get<CmsHowToStepResponse[]>("/admin/cms/how-to-steps");
  return response.data;
}

export async function createCmsHowToStepApi(payload: CmsHowToStepUpsertRequest): Promise<CmsHowToStepResponse> {
  const response = await apiClient.post<CmsHowToStepResponse>("/admin/cms/how-to-steps", payload);
  return response.data;
}

export async function updateCmsHowToStepApi(id: string, payload: CmsHowToStepUpsertRequest): Promise<CmsHowToStepResponse> {
  const response = await apiClient.patch<CmsHowToStepResponse>(`/admin/cms/how-to-steps/${id}`, payload);
  return response.data;
}

export async function deleteCmsHowToStepApi(id: string): Promise<void> {
  await apiClient.delete(`/admin/cms/how-to-steps/${id}`);
}

export async function getCmsFaqsApi(): Promise<CmsFaqResponse[]> {
  const response = await apiClient.get<CmsFaqResponse[]>("/admin/cms/faqs");
  return response.data;
}

export async function createCmsFaqApi(payload: CmsFaqUpsertRequest): Promise<CmsFaqResponse> {
  const response = await apiClient.post<CmsFaqResponse>("/admin/cms/faqs", payload);
  return response.data;
}

export async function updateCmsFaqApi(id: string, payload: CmsFaqUpsertRequest): Promise<CmsFaqResponse> {
  const response = await apiClient.patch<CmsFaqResponse>(`/admin/cms/faqs/${id}`, payload);
  return response.data;
}

export async function deleteCmsFaqApi(id: string): Promise<void> {
  await apiClient.delete(`/admin/cms/faqs/${id}`);
}

export async function getCmsStatsApi(): Promise<CmsStatResponse[]> {
  const response = await apiClient.get<CmsStatResponse[]>("/admin/cms/stats");
  return response.data;
}

export async function createCmsStatApi(payload: CmsStatUpsertRequest): Promise<CmsStatResponse> {
  const response = await apiClient.post<CmsStatResponse>("/admin/cms/stats", payload);
  return response.data;
}

export async function updateCmsStatApi(id: string, payload: CmsStatUpsertRequest): Promise<CmsStatResponse> {
  const response = await apiClient.patch<CmsStatResponse>(`/admin/cms/stats/${id}`, payload);
  return response.data;
}

export async function deleteCmsStatApi(id: string): Promise<void> {
  await apiClient.delete(`/admin/cms/stats/${id}`);
}

export async function reindexAllExerciseEmbeddingsApi(): Promise<ExerciseEmbeddingIndexingResult> {
  const response = await apiClient.post<ExerciseEmbeddingIndexingResult>(
    "/admin/embeddings/reindex",
    undefined,
    { timeout: 300_000 }
  );
  return response.data;
}

export async function getExerciseEmbeddingStatusApi(): Promise<ExerciseEmbeddingStatusResponse> {
  const response = await apiClient.get<ExerciseEmbeddingStatusResponse>("/admin/embeddings/status");
  return response.data;
}
