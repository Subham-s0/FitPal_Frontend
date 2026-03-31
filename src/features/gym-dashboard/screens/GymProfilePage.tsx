import { useState, type FC } from "react";
import { StatusBadge } from "@/features/gym-dashboard/components/BadgeVariants";
import { FileText } from "lucide-react";

const profileFields = {
  branding: [
    ["Gym Name", "FitZone Kathmandu"], ["Gym Type", "Commercial"],
    ["Registration No", "123456/079/080"], ["Established", "2019"],
    ["Max Capacity", "150 members"], ["Approval Status", "Verified ✓"],
  ],
  location: [
    ["Street", "123 Durbar Marg"], ["City", "Kathmandu"],
    ["Country", "Nepal"], ["Postal", "44600"], ["Coordinates", "27.7172° N, 85.3240° E"],
  ],
  contact: [
    ["Phone", "+977 01-4123456"], ["Contact Email", "hello@fitzone.com"],
    ["Login Email", "subham@gmail.com"], ["Website", "fitzonekathmandu.com"],
    ["Opens At", "06:00 AM"], ["Closes At", "10:00 PM"],
  ],
};

const amenities = ["Free Weights", "Cardio Zone", "Locker Rooms", "Parking", "AC", "Cafeteria", "Personal Training", "Group Classes", "Yoga Studio", "Steam Room"];

const docs = [
  { name: "Registration Certificate",  status: "approved", uploaded: "12 Jan 2026", expires: "12 Jan 2027" },
  { name: "Operating License / Permit", status: "expiring", uploaded: "15 Mar 2025", expires: "04 Apr 2026" },
  { name: "Tax Certificate",           status: "approved", uploaded: "01 Feb 2026", expires: "01 Feb 2027" },
  { name: "Owner ID Proof",            status: "approved", uploaded: "12 Jan 2026", expires: "—" },
  { name: "Address Proof",             status: "rejected", uploaded: "12 Jan 2026", expires: "—" },
];

const FieldRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start gap-3 border-b border-white/[0.035] py-3 last:border-b-0">
    <span className="w-[130px] flex-shrink-0 pt-0.5 text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{label}</span>
    <span className="flex-1 text-xs font-medium text-gray-200">{value}</span>
    <button className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-500 transition-colors hover:bg-orange-500/10">Edit</button>
  </div>
);

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";
const secLabel = "mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500";

const GymProfilePage: FC = () => {
  const [tab, setTab] = useState<"profile" | "documents">("profile");

  return (
    <div className="max-w-[1600px] animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
            <span className="inline-block h-px w-4 bg-orange-500" />Identity &amp; Compliance
          </p>
          <h1 className="text-xl font-black uppercase tracking-tight">Profile &amp; <span className="text-gradient-fire">Documents</span></h1>
          <p className="mt-1 text-[11px] text-zinc-600">Manage your gym listing, contact info, and verification documents</p>
        </div>
        <div className="flex gap-2">
          {tab === "profile" && (
            <>
              <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Discard</button>
              <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">Save Changes</button>
            </>
          )}
          {tab === "documents" && (
            <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">+ Upload Document</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
        {(["profile", "documents"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-orange-500/[0.12] text-orange-500" : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-400"}`}>
            {t === "profile" ? "Gym Profile" : "Documents & Verification"}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={card}>
              <p className={secLabel}>Branding</p>
              <div className="mb-4 flex items-center gap-3.5">
                <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-orange-500/25 bg-orange-500/[0.08] text-xl font-black">
                  <span className="text-gradient-fire">FZ</span>
                </div>
                <div>
                  <div className="text-sm font-bold">FitZone Kathmandu</div>
                  <div className="mb-2 text-[10px] text-zinc-600">Commercial · Est. 2019</div>
                  <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Change Logo</button>
                </div>
              </div>
              <div className="mb-4 flex h-[84px] cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-dashed border-orange-500/20 bg-orange-500/[0.04] text-[11px] text-zinc-600">
                + Upload Cover Photo
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className="text-zinc-600">Profile Completion</span>
                  <span className="font-bold text-orange-500">72%</span>
                </div>
                <div className="h-[3px] overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: "72%" }} />
                </div>
                <div className="mt-1 text-[9px] text-zinc-600">Add description and gallery to reach 100%</div>
              </div>
            </div>
            <div className={card}>
              <p className={secLabel}>Basic Information</p>
              {profileFields.branding.map(([l, v]) => <FieldRow key={l} label={l} value={v} />)}
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={card}>
              <p className={secLabel}>Location &amp; Address</p>
              {profileFields.location.map(([l, v]) => <FieldRow key={l} label={l} value={v} />)}
            </div>
            <div className={card}>
              <p className={secLabel}>Contact &amp; Hours</p>
              {profileFields.contact.map(([l, v]) => <FieldRow key={l} label={l} value={v} />)}
            </div>
          </div>
          <div className={card}>
            <p className={secLabel}>Description &amp; Amenities</p>
            <textarea
              className="mb-4 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs font-medium text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-orange-500/40"
              style={{ minHeight: 68 }}
              defaultValue="FitZone Kathmandu is a premium fitness facility in the heart of Durbar Marg, equipped with state-of-the-art equipment, certified trainers, and a welcoming community."
            />
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <span key={a} className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-orange-500">{a}</span>
              ))}
              <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">+ Add</button>
            </div>
          </div>
        </>
      )}

      {tab === "documents" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ l: "Total", v: "5" }, { l: "Approved", v: "3" }, { l: "Expiring", v: "1" }, { l: "Rejected", v: "1" }].map((s, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-[#0a0a0a] p-4">
                <div className="mb-2 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">{s.l}</div>
                <div className="text-2xl font-black leading-none tracking-tight">{s.v}</div>
              </div>
            ))}
          </div>

          {docs.map((d, i) => (
            <div key={i} className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.055] bg-[#0a0a0a] p-3 transition-colors hover:border-orange-500/15">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/[0.08]">
                <FileText className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold">{d.name}</div>
                <div className="text-[10px] text-zinc-600">Uploaded {d.uploaded} · Expires {d.expires}</div>
                {d.status === "rejected" && <div className="mt-0.5 text-[10px] text-red-400">Rejected: Document quality too low. Re-upload a clear scan.</div>}
              </div>
              <StatusBadge status={d.status} />
              <div className="flex flex-shrink-0 gap-2">
                <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Replace</button>
                {d.status === "rejected" && (
                  <button className="rounded-lg bg-orange-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-orange-600">Resubmit</button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default GymProfilePage;
