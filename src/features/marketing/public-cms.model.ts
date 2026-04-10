import type {
  CmsFeatureResponse,
  CmsTestimonialResponse,
  CmsHowToStepResponse,
  CmsFaqResponse,
  CmsStatResponse,
} from "@/features/admin/admin-settings.model";

export interface PublicCmsHomeResponse {
  features: CmsFeatureResponse[];
  testimonials: CmsTestimonialResponse[];
  howToSteps: CmsHowToStepResponse[];
  faqs: CmsFaqResponse[];
  stats: CmsStatResponse[];
}
