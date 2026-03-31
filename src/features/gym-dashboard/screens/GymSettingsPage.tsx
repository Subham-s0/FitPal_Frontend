import type { FC } from "react";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const FieldRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start gap-3 border-b border-white/[0.035] py-3 last:border-b-0">
    <span className="w-[130px] flex-shrink-0 pt-0.5 text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{label}</span>
    <span className="flex-1 text-xs font-medium text-gray-200">{value}</span>
    <button className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-500 transition-colors hover:bg-orange-500/10">Edit</button>
  </div>
);

const GymSettingsPage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Configuration
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">Gym <span className="text-gradient-fire">Settings</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">Payout, notifications, and business configuration</p>
      </div>
      <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">Save All</button>
    </div>

    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Payout Settings</p>
        {[["Bank Name", "Nepal Investment Bank"], ["Account Number", "••••••• 4829"], ["Account Name", "FitZone Pvt Ltd"], ["Payout Frequency", "Weekly (Every Tuesday)"]].map(([l, v]) => (
          <FieldRow key={l} label={l} value={v} />
        ))}
        <button className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Update Bank Details</button>
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Notification Preferences</p>
        {([["New member check-in", true], ["Failed scan alert", true], ["Payout received", true], ["Document expiry reminder", true], ["Low rating alert", true], ["Daily summary email", false]] as [string, boolean][]).map(([l, on], i) => (
          <div key={i} className="flex items-center justify-between border-b border-white/[0.035] py-2.5 last:border-b-0">
            <span className="text-xs text-gray-300">{l}</span>
            <div
              className="relative h-[18px] w-[34px] flex-shrink-0 cursor-pointer rounded-full border transition-colors"
              style={{
                background: on ? "#f97316" : "rgba(255,255,255,0.07)",
                borderColor: on ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.1)",
              }}
            >
              <div className="absolute top-[2px] h-3 w-3 rounded-full bg-white transition-all" style={{ left: on ? 18 : 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={card}>
      <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Audit Log</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Action", "User", "Date", "Details"].map(h => (
              <th key={h} className="pb-2 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ["Profile Updated", "Subham Shahi", "21 Mar 2026", "Changed opening hours"],
            ["QR Regenerated", "Subham Shahi", "21 Mar 2026", "Scheduled rotation"],
            ["Document Uploaded", "Subham Shahi", "12 Jan 2026", "Registration Certificate"],
            ["Equipment Added", "Subham Shahi", "18 Mar 2026", "Spin Bike ×12"],
            ["Payout Settings Edit", "Subham Shahi", "05 Mar 2026", "Updated bank account"],
          ].map(([a, u, d, det], i) => (
            <tr key={i} className="transition-colors hover:bg-white/[0.015]">
              <td className="border-t border-white/[0.03] py-2.5 text-xs font-semibold">{a}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-[11px] text-zinc-400">{u}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-[10px] text-zinc-600">{d}</td>
              <td className="border-t border-white/[0.03] py-2.5 text-[10px] text-zinc-600">{det}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default GymSettingsPage;
