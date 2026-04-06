/**
 * Marketing CMS types and offline fallback (matches V24 Flyway seed / last-known-good copy).
 * Home page loads live content from GET /public/cms/home via usePublicCmsHome.
 */

export type CmsFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlight: boolean;
  active: boolean;
  order: number;
};

export type CmsTestimonial = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
  approved: boolean;
  order: number;
};

export type CmsHowToStep = {
  id: string;
  stepNumber: string;
  icon: string;
  title: string;
  description: string;
  published: boolean;
  order: number;
};

export type CmsStat = {
  id: string;
  icon: string;
  value: string;
  label: string;
  active: boolean;
  order: number;
};

export type CmsFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;
  order: number;
};

export type CmsAnnouncement = {
  id: string;
  title: string;
  audience: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt: string | null;
};

export type CmsState = {
  features: CmsFeature[];
  testimonials: CmsTestimonial[];
  howToSteps: CmsHowToStep[];
  stats: CmsStat[];
  faqs: CmsFaq[];
  announcements: CmsAnnouncement[];
};

/** Slices rendered on the public home page from CMS */
export type MarketingHomeCms = {
  features: CmsFeature[];
  testimonials: CmsTestimonial[];
  howToSteps: CmsHowToStep[];
  stats: CmsStat[];
};

const DEFAULTS: CmsState = {
  features: [
    { id: "f1", icon: "QrCode", title: "QR Check-In", description: "Seamless gym entry with quick QR code scanning at any partner location.", highlight: true, active: true, order: 1 },
    { id: "f2", icon: "Target", title: "Smart Routines", description: "AI-powered workout plans tailored to your fitness goals and preferences.", highlight: false, active: true, order: 2 },
    { id: "f3", icon: "BarChart3", title: "Progress Tracking", description: "Comprehensive analytics to monitor your fitness journey over time.", highlight: false, active: true, order: 3 },
    { id: "f4", icon: "MapPin", title: "Gym Discovery", description: "Find and explore partner gyms near you with detailed information.", highlight: false, active: true, order: 4 },
    { id: "f5", icon: "CreditCard", title: "Flexible Plans", description: "Choose from multiple subscription tiers to match your fitness needs.", highlight: true, active: true, order: 5 },
    { id: "f6", icon: "Shield", title: "Secure Payments", description: "Safe and encrypted payment processing through trusted gateways.", highlight: false, active: true, order: 6 },
  ],
  testimonials: [
    { id: "t1", name: "Aarav Sharma", role: "Fitness Enthusiast", avatar: "", content: "FitPal has transformed how I work out. I can visit any gym in the city with just my phone!", rating: 5, approved: true, order: 1 },
    { id: "t2", name: "Priya Thapa", role: "Working Professional", avatar: "", content: "The flexibility to train at different gyms based on my schedule is amazing. Best fitness app ever!", rating: 5, approved: true, order: 2 },
    { id: "t3", name: "Bikash Gurung", role: "Student", avatar: "", content: "Affordable plans and great gym selection. Perfect for students like me on a budget.", rating: 4, approved: false, order: 3 },
  ],
  howToSteps: [
    { id: "h1", stepNumber: "01", icon: "UserPlus", title: "Create", description: "Sign up with your email or Google account in seconds.", published: true, order: 1 },
    { id: "h2", stepNumber: "02", icon: "CreditCard", title: "Subscribe", description: "Pick a plan and activate access to partner gyms that match your goals.", published: true, order: 2 },
    { id: "h3", stepNumber: "03", icon: "Search", title: "Find", description: "Discover nearby partner gyms, amenities, and hours in one place.", published: true, order: 3 },
    { id: "h4", stepNumber: "04", icon: "ScanLine", title: "Scan", description: "Check in at the door with your FitPal QR code—no cards or front-desk hassle.", published: true, order: 4 },
    { id: "h5", stepNumber: "05", icon: "Dumbbell", title: "Train", description: "Work out with guided routines or freestyle using the gym’s equipment.", published: true, order: 5 },
    { id: "h6", stepNumber: "06", icon: "BarChart3", title: "Record", description: "Log sets and reps and watch your progress on your personal dashboard.", published: true, order: 6 },
  ],
  stats: [
    { id: "s1", icon: "Dumbbell", value: "150+", label: "Partner Gyms", active: true, order: 1 },
    { id: "s2", icon: "Users", value: "10,000+", label: "Active Members", active: true, order: 2 },
    { id: "s3", icon: "ScanLine", value: "2,500+", label: "Check-ins Daily", active: true, order: 3 },
    { id: "s4", icon: "MapPin", value: "5", label: "Cities Covered", active: true, order: 4 },
  ],
  faqs: [
    { id: "fq1", question: "How does the QR check-in work?", answer: "Simply open the FitPal app at any partner gym, show your unique QR code to the scanner, and the door will unlock automatically.", category: "Check-In", published: true, order: 1 },
    { id: "fq2", question: "Can I visit multiple gyms?", answer: "Yes! Your subscription gives you access to all partner gyms based on your plan tier. Basic gets standard gyms, Pro gets premium, and Elite gets all locations.", category: "Subscription", published: true, order: 2 },
    { id: "fq3", question: "What if my QR code doesn't work?", answer: "Contact the gym staff immediately. They can manually verify your subscription and grant access. Also check if your subscription is active in the app.", category: "Troubleshooting", published: true, order: 3 },
    { id: "fq4", question: "How do I cancel my subscription?", answer: "You can manage your subscription from the app settings. Cancellations take effect at the end of your current billing period.", category: "Subscription", published: true, order: 4 },
    { id: "fq5", question: "Are there any hidden fees?", answer: "No hidden fees! The price you see includes all applicable taxes and charges. What you see is what you pay.", category: "Billing", published: true, order: 5 },
  ],
  announcements: [],
};

export function getMarketingCmsFallback(): MarketingHomeCms {
  return {
    features: structuredClone(DEFAULTS.features),
    testimonials: structuredClone(DEFAULTS.testimonials),
    howToSteps: structuredClone(DEFAULTS.howToSteps),
    stats: structuredClone(DEFAULTS.stats),
  };
}
