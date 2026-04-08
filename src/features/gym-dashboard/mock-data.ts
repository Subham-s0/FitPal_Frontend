import type { MemberRow, NoticeRow, PayoutRow, ReviewRow, ScanRow } from "./types";

export const SCANS: ScanRow[] = [
  { time: "08:14", member: "Aarav Sharma", plan: "Pro", result: "success" },
  { time: "08:31", member: "Priya Thapa", plan: "Elite", result: "success" },
  { time: "08:45", member: "Unknown Badge", plan: "-", result: "failed" },
  { time: "09:02", member: "Bikram Rai", plan: "Basic", result: "success" },
  { time: "09:18", member: "Sunita Gurung", plan: "Pro", result: "denied" },
  { time: "09:44", member: "Rajan Koirala", plan: "Basic", result: "success" },
  { time: "10:05", member: "Manisha Poudel", plan: "Pro", result: "success" },
  { time: "10:22", member: "Dev Adhikari", plan: "Basic", result: "failed" },
];

export const MEMBERS: MemberRow[] = [
  { name: "Aarav Sharma", avatar: "AS", plan: "Pro", visits: 42, last: "Today", passStatus: "active" },
  { name: "Priya Thapa", avatar: "PT", plan: "Elite", visits: 38, last: "Today", passStatus: "active" },
  { name: "Bikram Rai", avatar: "BR", plan: "Basic", visits: 27, last: "Yesterday", passStatus: "active" },
  { name: "Manisha Poudel", avatar: "MP", plan: "Pro", visits: 19, last: "2 days ago", passStatus: "active" },
  { name: "Rajan Koirala", avatar: "RK", plan: "Basic", visits: 11, last: "5 days ago", passStatus: "expiring" },
  { name: "Sunita Gurung", avatar: "SG", plan: "Pro", visits: 8, last: "1 week ago", passStatus: "flagged" },
  { name: "Dev Adhikari", avatar: "DA", plan: "Basic", visits: 3, last: "2 weeks ago", passStatus: "expired" },
];

export const PAYOUTS: PayoutRow[] = [
  { ref: "PAY-20260318", date: "18 Mar 2026", amount: "NPR 48,200", status: "completed" },
  { ref: "PAY-20260311", date: "11 Mar 2026", amount: "NPR 52,750", status: "completed" },
  { ref: "PAY-20260304", date: "04 Mar 2026", amount: "NPR 39,400", status: "completed" },
  { ref: "PAY-20260325", date: "25 Mar 2026", amount: "NPR 61,000", status: "pending" },
  { ref: "PAY-20260218", date: "18 Feb 2026", amount: "NPR 29,800", status: "failed" },
];

export const REVIEWS: ReviewRow[] = [
  { name: "Aarav Sharma", rating: 5, text: "Excellent equipment and clean facilities. Staff is very helpful.", date: "2 days ago" },
  { name: "Priya Thapa", rating: 4, text: "Good gym overall. Could use more cardio machines during peak hours.", date: "5 days ago" },
  { name: "Bikram Rai", rating: 5, text: "Best gym in Kathmandu! Love the atmosphere.", date: "1 week ago" },
  { name: "Anonymous", rating: 2, text: "Waiting times are too long in the morning. Please fix the QR scanner.", date: "1 week ago" },
  { name: "Manisha Poudel", rating: 4, text: "Great trainers and good facilities. Happy with my membership.", date: "2 weeks ago" },
];

export const NOTICES: NoticeRow[] = [
  { title: "Gym closed on Holi - 14 March", audience: "All members", date: "10 Mar 2026", status: "sent" },
  { title: "New cardio equipment arriving", audience: "All members", date: "20 Mar 2026", status: "scheduled" },
  { title: "Summer schedule change", audience: "All members", date: "01 Apr 2026", status: "scheduled" },
  { title: "Maintenance: showers out 9-11am", audience: "All members", date: "08 Mar 2026", status: "sent" },
];
