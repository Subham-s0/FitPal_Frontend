import { deleteApiData, getApiData, patchApiData, postApiData } from "@/shared/api/client";
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
  return getApiData<ApplicationRuleSummaryResponse>("/admin/application-rules/summary");
}

export async function updateApplicationRulesApi(payload: ApplicationRuleUpdateRequest): Promise<ApplicationRuleSummaryResponse> {
  return patchApiData<ApplicationRuleSummaryResponse>("/admin/application-rules", payload);
}

export async function getCmsFeaturesApi(): Promise<CmsFeatureResponse[]> {
  return getApiData<CmsFeatureResponse[]>("/admin/cms/features");
}

export async function createCmsFeatureApi(payload: CmsFeatureUpsertRequest): Promise<CmsFeatureResponse> {
  return postApiData<CmsFeatureResponse>("/admin/cms/features", payload);
}

export async function updateCmsFeatureApi(id: string, payload: CmsFeatureUpsertRequest): Promise<CmsFeatureResponse> {
  return patchApiData<CmsFeatureResponse>(`/admin/cms/features/${id}`, payload);
}

export async function deleteCmsFeatureApi(id: string): Promise<void> {
  await deleteApiData(`/admin/cms/features/${id}`);
}

export async function getCmsTestimonialsApi(): Promise<CmsTestimonialResponse[]> {
  return getApiData<CmsTestimonialResponse[]>("/admin/cms/testimonials");
}

export async function createCmsTestimonialApi(payload: CmsTestimonialUpsertRequest): Promise<CmsTestimonialResponse> {
  return postApiData<CmsTestimonialResponse>("/admin/cms/testimonials", payload);
}

export async function updateCmsTestimonialApi(id: string, payload: CmsTestimonialUpsertRequest): Promise<CmsTestimonialResponse> {
  return patchApiData<CmsTestimonialResponse>(`/admin/cms/testimonials/${id}`, payload);
}

export async function deleteCmsTestimonialApi(id: string): Promise<void> {
  await deleteApiData(`/admin/cms/testimonials/${id}`);
}

export async function getCmsHowToStepsApi(): Promise<CmsHowToStepResponse[]> {
  return getApiData<CmsHowToStepResponse[]>("/admin/cms/how-to-steps");
}

export async function createCmsHowToStepApi(payload: CmsHowToStepUpsertRequest): Promise<CmsHowToStepResponse> {
  return postApiData<CmsHowToStepResponse>("/admin/cms/how-to-steps", payload);
}

export async function updateCmsHowToStepApi(id: string, payload: CmsHowToStepUpsertRequest): Promise<CmsHowToStepResponse> {
  return patchApiData<CmsHowToStepResponse>(`/admin/cms/how-to-steps/${id}`, payload);
}

export async function deleteCmsHowToStepApi(id: string): Promise<void> {
  await deleteApiData(`/admin/cms/how-to-steps/${id}`);
}

export async function getCmsFaqsApi(): Promise<CmsFaqResponse[]> {
  return getApiData<CmsFaqResponse[]>("/admin/cms/faqs");
}

export async function createCmsFaqApi(payload: CmsFaqUpsertRequest): Promise<CmsFaqResponse> {
  return postApiData<CmsFaqResponse>("/admin/cms/faqs", payload);
}

export async function updateCmsFaqApi(id: string, payload: CmsFaqUpsertRequest): Promise<CmsFaqResponse> {
  return patchApiData<CmsFaqResponse>(`/admin/cms/faqs/${id}`, payload);
}

export async function deleteCmsFaqApi(id: string): Promise<void> {
  await deleteApiData(`/admin/cms/faqs/${id}`);
}

export async function getCmsStatsApi(): Promise<CmsStatResponse[]> {
  return getApiData<CmsStatResponse[]>("/admin/cms/stats");
}

export async function createCmsStatApi(payload: CmsStatUpsertRequest): Promise<CmsStatResponse> {
  return postApiData<CmsStatResponse>("/admin/cms/stats", payload);
}

export async function updateCmsStatApi(id: string, payload: CmsStatUpsertRequest): Promise<CmsStatResponse> {
  return patchApiData<CmsStatResponse>(`/admin/cms/stats/${id}`, payload);
}

export async function deleteCmsStatApi(id: string): Promise<void> {
  await deleteApiData(`/admin/cms/stats/${id}`);
}

export async function reindexAllExerciseEmbeddingsApi(): Promise<ExerciseEmbeddingIndexingResult> {
  return postApiData<ExerciseEmbeddingIndexingResult>(
    "/admin/embeddings/reindex",
    undefined,
    { timeout: 300_000 }
  );
}

export async function getExerciseEmbeddingStatusApi(): Promise<ExerciseEmbeddingStatusResponse> {
  return getApiData<ExerciseEmbeddingStatusResponse>("/admin/embeddings/status");
}
