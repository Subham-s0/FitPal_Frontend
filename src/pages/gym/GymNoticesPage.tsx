import type { FC } from "react";
import { StatusBadge } from "@/components/gym/BadgeVariants";
import { NOTICES } from "@/components/gym/mock-data";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymNoticesPage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Communication
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">Notices &amp; <span className="text-gradient-fire">Announcements</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">Post notices visible to members on the FitPal app</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">New Announcement</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Title</label>
            <input className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-orange-500/40" placeholder="e.g. Gym closed on public holiday" />
          </div>
          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Message</label>
            <textarea className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-orange-500/40" style={{ minHeight: 72 }} placeholder="Write your message…" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Audience</label>
              <select className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/40">
                <option>All Members</option><option>Active Only</option><option>Expiring</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">Schedule</label>
              <input className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/40" type="date" />
            </div>
          </div>
          <button className="rounded-lg bg-orange-500 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">Send Announcement</button>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Recent Announcements</p>
        {NOTICES.map((n, i) => (
          <div key={i} className="mb-2 rounded-xl border border-white/5 bg-[#0a0a0a] p-3">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="text-xs font-bold">{n.title}</div>
              <StatusBadge status={n.status} />
            </div>
            <div className="text-[10px] text-zinc-600">{n.audience} · {n.date}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default GymNoticesPage;
