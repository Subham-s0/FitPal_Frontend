import type {
  CmsFeature,
  CmsHowToStep,
  CmsStat,
  CmsTestimonial,
  MarketingHomeCms,
} from "@/features/marketing/cms-store";
import type { PublicCmsHomeResponse } from "@/features/marketing/public-cms.model";

export function mapPublicCmsHomeToMarketing(home: PublicCmsHomeResponse): MarketingHomeCms {
  return {
    features: home.features.map(
      (f): CmsFeature => ({
        id: String(f.id),
        icon: f.icon,
        title: f.title,
        description: f.description,
        highlight: Boolean(f.highlight),
        active: Boolean(f.active),
        order: f.order ?? 0,
      })
    ),
    testimonials: home.testimonials.map(
      (t): CmsTestimonial => ({
        id: String(t.id),
        name: t.name,
        role: t.role ?? "",
        avatar: t.avatar ?? "",
        content: t.content,
        rating: t.rating,
        approved: Boolean(t.approved),
        order: t.order ?? 0,
      })
    ),
    howToSteps: home.howToSteps.map(
      (s): CmsHowToStep => ({
        id: String(s.id),
        stepNumber: s.stepNumber,
        icon: s.icon,
        title: s.title,
        description: s.description,
        published: Boolean(s.published),
        order: s.order ?? 0,
      })
    ),
    stats: home.stats.map(
      (s): CmsStat => ({
        id: String(s.id),
        icon: s.icon,
        label: s.label,
        value: `${s.value ?? ""}${s.suffix ?? ""}`,
        active: Boolean(s.active),
        order: s.order ?? 0,
      })
    ),
  };
}
