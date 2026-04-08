export type GymPageId =
  | "home" | "gymProfile" | "qr"
  | "members" | "revenue" | "insights"
  | "reviews" | "notices" | "settings";

export interface ScanRow {
  time: string;
  member: string;
  plan: string;
  result: "success" | "failed" | "denied";
}

export interface MemberRow {
  name: string;
  avatar: string;
  plan: "Basic" | "Pro" | "Elite";
  visits: number;
  last: string;
  passStatus: "active" | "expiring" | "flagged" | "expired";
}

export interface PayoutRow {
  ref: string;
  date: string;
  amount: string;
  status: "completed" | "pending" | "failed";
}

export interface ReviewRow {
  name: string;
  rating: number;
  text: string;
  date: string;
}

export interface NoticeRow {
  title: string;
  audience: string;
  date: string;
  status: "sent" | "scheduled";
}
