import { useState, type FC } from "react";
import { ConditionBadge } from "@/features/gym-dashboard/components/BadgeVariants";
import { EQUIPMENT } from "@/features/gym-dashboard/mock-data";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymEquipmentPage: FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(EQUIPMENT.map(e => e.category)))];
  const filtered = filter === "All" ? EQUIPMENT : EQUIPMENT.filter(e => e.category === filter);

  return (
    <div className="max-w-[1600px] animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
            <span className="inline-block h-px w-4 bg-orange-500" />Facility
          </p>
          <h1 className="text-xl font-black uppercase tracking-tight">Equipment &amp; <span className="text-gradient-fire">Facility</span></h1>
          <p className="mt-1 text-[11px] text-zinc-600">Showcase your equipment to attract members. Photos and condition are visible on your public profile.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Export List</button>
          <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600" onClick={() => setShowModal(true)}>+ Add Equipment</button>
        </div>
      </div>

      {/* Stat Row */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[{ l: "Total Items", v: "10" }, { l: "Excellent", v: "5" }, { l: "Good", v: "4" }, { l: "Needs Repair", v: "1" }, { l: "Photos Uploaded", v: "6" }].map((s, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-[#0a0a0a] p-4">
            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.11em] text-zinc-600">{s.l}</div>
            <div className="text-2xl font-black leading-none tracking-tight">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all ${filter === c ? "bg-orange-500 text-white" : "border border-white/[0.07] bg-white/[0.04] text-zinc-500 hover:text-white"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map(eq => (
          <div key={eq.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0a] transition-all hover:-translate-y-0.5 hover:border-orange-500/25">
            <div className="relative flex h-[110px] items-center justify-center border-b border-white/5 bg-orange-500/[0.04] text-[42px]">
              {eq.photo}
              <button className="absolute bottom-2 right-2 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:border-orange-500/30 hover:text-orange-500">📷 Photos</button>
            </div>
            <div className="p-3.5">
              <div className="mb-0.5 text-[13px] font-bold">{eq.name}</div>
              <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">{eq.category}</div>
              <div className="mb-2.5 text-[11px] leading-relaxed text-zinc-600">{eq.desc}</div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-zinc-400">Qty: <strong className="text-white">{eq.count}</strong></div>
                <ConditionBadge condition={eq.condition} />
              </div>
              <div className="mt-2.5 flex gap-2">
                <button className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Edit</button>
                {eq.condition === "needs-repair" && (
                  <button className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 hover:bg-red-400/20">Flag</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Card */}
        <div
          className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-orange-500/20 transition-colors hover:border-orange-500/40"
          onClick={() => setShowModal(true)}
        >
          <div className="text-3xl opacity-40">+</div>
          <div className="text-xs font-bold text-zinc-600">Add Equipment</div>
          <div className="text-[10px] text-zinc-600">Photo, name, condition</div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="relative w-full max-w-[460px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d0d] p-7" style={{ maxHeight: "85vh" }}>
            <button className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-sm text-zinc-500 hover:bg-white/10 hover:text-white" onClick={() => setShowModal(false)}>✕</button>
            <div className="mb-1 text-[15px] font-extrabold uppercase tracking-tight">Add Equipment</div>
            <div className="mb-5 text-[11px] text-zinc-600">Add details and photos to showcase on your public profile.</div>

            <div className="mb-4 flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-orange-500/20 bg-orange-500/[0.04]">
              <div className="text-xl">📷</div>
              <div className="text-[11px] font-bold text-zinc-600">Click to upload photos</div>
              <div className="text-[9px] text-zinc-600">JPG, PNG · Max 5MB per photo · Up to 6 photos</div>
            </div>

            <div className="flex flex-col gap-3">
              {[["Equipment Name", "e.g. Olympic Barbell Set"], ["Category", "e.g. Free Weights"], ["Quantity", "e.g. 6"]].map(([l, p]) => (
                <div key={l}>
                  <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{l}</label>
                  <input className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-orange-500/40" placeholder={p} />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">Description</label>
                <textarea className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-orange-500/40" placeholder="Describe specs, brand, features…" style={{ minHeight: 60 }} />
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">Condition</label>
                <select className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/40">
                  <option>Excellent</option><option>Good</option><option>Needs Repair</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="flex-[2] rounded-lg bg-orange-500 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600" onClick={() => setShowModal(false)}>Save Equipment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymEquipmentPage;
