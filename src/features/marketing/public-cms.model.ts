import type {
  CmsFeatureResponse,
  CmsTestimonialResponse,
  CmsHowToStepResponse,
  CmsFaqResponse,
  CmsAnnouncementResponse,
  CmsStatResponse,
} from "@/features/admin/admin-settings.model";

/** Matches backend `PublicCmsHomeResponse` at GET /public/cms/home */
export interface PublicCmsHomeResponse {
  features: CmsFeatureResponse[];
  testimonials: CmsTestimonialResponse[];
  howToSteps: CmsHowToStepResponse[];
  faqs: CmsFaqResponse[];
  announcements: CmsAnnouncementResponse[];
  stats: CmsStatResponse[];
}
