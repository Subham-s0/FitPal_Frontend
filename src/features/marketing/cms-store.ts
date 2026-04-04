/**
 * cms-store.ts
 *
 * In-memory reactive CMS store using React's useSyncExternalStore pattern,
 * consistent with how authStore is built in this codebase.
 *
 * The store seeds with the same default content that was previously hardcoded
 * in the marketing components. When a real backend CMS API exists, replace
 * the seed calls with API responses and call `cmsStore.setSection(...)` after
 * fetching.
 *
 * Home page components read from this store and fall back to empty arrays
 * (so if the store is cleared, sections with no items simply don't render).
 */

/* ── Types ─────────────────────────────────────────────────────────── */
export type CmsFeature = {
  id: string;
  icon: string;           // lucide icon name as string
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
  rating: number;         // 1-5
  approved: boolean;
  order: number;
};

export type CmsHowToStep = {
  id: string;
  stepNumber: string;     // "01", "02", etc.
  icon: string;           // lucide icon name
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

/* ── Default seed data (mirrors what was hardcoded in marketing) ─────── */
const DEFAULTS: CmsState = {
  features: [
    { id: "f1", icon: "QrCode",     title: "QR Check-In",       description: "Instant gym access with a simple QR code scan. No cards, no hassle.", highlight: true,  active: true, order: 1 },
    { id: "f2", icon: "Target",     title: "Personalized Plans", description: "AI-powered workout plans tailored to your fitness goals and experience.", highlight: true,  active: true, order: 2 },
    { id: "f3", icon: "BarChart3",  title: "Progress Tracking",  description: "Visual dashboards to monitor your fitness journey and achievements.",   highlight: false, active: true, order: 3 },
    { id: "f4", icon: "MapPin",     title: "Smart Discovery",    description: "Find the perfect gym based on location, amenities, and user ratings.",  highlight: false, active: true, order: 4 },
    { id: "f5", icon: "CreditCard", title: "Easy Payments",      description: "Secure payment integration with Khalti for seamless subscriptions.",    highlight: false, active: true, order: 5 },
    { id: "f6", icon: "Shield",     title: "Secure Access",      description: "Role-based authentication keeping your data safe and private.",          highlight: false, active: true, order: 6 },
    { id: "f7", icon: "Dumbbell",   title: "500+ Gyms",          description: "Access to a vast network of premium fitness centers across the city.",   highlight: false, active: true, order: 7 },
    { id: "f8", icon: "Calendar",   title: "Flexible Plans",     description: "Pause, resume, or upgrade your subscription anytime you want.",          highlight: false, active: true, order: 8 },
  ],
  testimonials: [
    { id: "t1", name: "Arun Sharma",    role: "Fitness Enthusiast", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", content: "FitPal changed my workout routine completely. I can now try different gyms based on my mood and location. The QR check-in is incredibly convenient!", rating: 5, approved: true, order: 1 },
    { id: "t2", name: "Priya Adhikari", role: "Yoga Instructor",    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", content: "As someone who travels frequently, having access to multiple gyms with one subscription is a game-changer. The personalized workout plans are spot on!", rating: 5, approved: true, order: 2 },
    { id: "t3", name: "Bikash Thapa",   role: "CrossFit Athlete",   avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", content: "The progress tracking dashboard helps me stay motivated. I love seeing my improvement over time. Best fitness investment I've ever made!", rating: 5, approved: true, order: 3 },
  ],
  howToSteps: [
    { id: "h1", stepNumber: "01", icon: "UserPlus", title: "Create Account", description: "Sign up in seconds and choose the subscription plan that fits your lifestyle.", published: true, order: 1 },
    { id: "h2", stepNumber: "02", icon: "Search",   title: "Find Your Gym",  description: "Use our smart search to discover nearby gyms based on your location and preferences.", published: true, order: 2 },
    { id: "h3", stepNumber: "03", icon: "ScanLine", title: "Scan & Train",   description: "Simply scan the QR code at any partner gym and start your workout immediately.", published: true, order: 3 },
  ],
  stats: [
    { id: "s1", icon: "Dumbbell", value: "500+", label: "Partner Gyms",      active: true, order: 1 },
    { id: "s2", icon: "Users",    value: "50K+", label: "Active Members",    active: true, order: 2 },
    { id: "s3", icon: "MapPin",   value: "25+",  label: "Cities Covered",    active: true, order: 3 },
    { id: "s4", icon: "Trophy",   value: "1M+",  label: "Workouts Tracked",  active: true, order: 4 },
  ],
  faqs: [
    { id: "fq1", question: "How do I cancel my subscription?",    answer: "Go to Settings → Billing → Cancel. Your access continues until the billing period ends.", category: "Billing",    published: true, order: 1 },
    { id: "fq2", question: "Can I use FitPal at multiple gyms?", answer: "Yes! Pro and Elite plans include multi-gym access to all partner locations.", category: "Access",     published: true, order: 2 },
    { id: "fq3", question: "How does the check-in system work?", answer: "Show your QR code at the gym scanner to automatically check in.", category: "Check-ins", published: true, order: 3 },
    { id: "fq4", question: "What happens if a payment fails?",   answer: "You'll get an email and in-app notification with retry options.", category: "Billing",    published: true, order: 4 },
  ],
  announcements: [
    { id: "a1", title: "Scheduled maintenance – Apr 10",           audience: "All users",   status: "published", scheduledAt: null },
    { id: "a2", title: "New Elite plan benefits launching soon",   audience: "Elite members", status: "draft",   scheduledAt: null },
    { id: "a3", title: "5 new partner gym locations added",        audience: "All users",   status: "scheduled", scheduledAt: "2026-04-20T09:00:00Z" },
  ],
};

/* ── Store implementation ───────────────────────────────────────────── */
let state: CmsState = structuredClone(DEFAULTS);
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Generic immutable list helpers */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((i) => i.id === item.id);
  if (idx === -1) return [...list, item];
  const next = [...list];
  next[idx] = item;
  return next;
}
function remove<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((i) => i.id !== id);
}
function sorted<T extends { order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.order - b.order);
}

export const cmsStore = {
  getSnapshot: (): CmsState => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Reset to seeded defaults */
  reset: () => {
    state = structuredClone(DEFAULTS);
    notify();
  },

  /* ── Features ── */
  setFeature: (feature: CmsFeature) => {
    state = { ...state, features: sorted(upsert(state.features, feature)) };
    notify();
  },
  removeFeature: (id: string) => {
    state = { ...state, features: remove(state.features, id) };
    notify();
  },

  /* ── Testimonials ── */
  setTestimonial: (t: CmsTestimonial) => {
    state = { ...state, testimonials: sorted(upsert(state.testimonials, t)) };
    notify();
  },
  removeTestimonial: (id: string) => {
    state = { ...state, testimonials: remove(state.testimonials, id) };
    notify();
  },

  /* ── How-To steps ── */
  setHowToStep: (step: CmsHowToStep) => {
    state = { ...state, howToSteps: sorted(upsert(state.howToSteps, step)) };
    notify();
  },
  removeHowToStep: (id: string) => {
    state = { ...state, howToSteps: remove(state.howToSteps, id) };
    notify();
  },

  /* ── Stats ── */
  setStat: (stat: CmsStat) => {
    state = { ...state, stats: sorted(upsert(state.stats, stat)) };
    notify();
  },
  removeStat: (id: string) => {
    state = { ...state, stats: remove(state.stats, id) };
    notify();
  },

  /* ── FAQs ── */
  setFaq: (faq: CmsFaq) => {
    state = { ...state, faqs: sorted(upsert(state.faqs, faq)) };
    notify();
  },
  removeFaq: (id: string) => {
    state = { ...state, faqs: remove(state.faqs, id) };
    notify();
  },

  /* ── Announcements ── */
  setAnnouncement: (a: CmsAnnouncement) => {
    state = { ...state, announcements: upsert(state.announcements, a) };
    notify();
  },
  removeAnnouncement: (id: string) => {
    state = { ...state, announcements: remove(state.announcements, id) };
    notify();
  },
};

/* ── Hook ──────────────────────────────────────────────────────────── */
import { useSyncExternalStore } from "react";

export function useCmsStore(): CmsState {
  return useSyncExternalStore(cmsStore.subscribe, cmsStore.getSnapshot);
}
