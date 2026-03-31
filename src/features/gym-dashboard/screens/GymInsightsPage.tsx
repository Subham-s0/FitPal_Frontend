import type { FC } from "react";
import StatCard from "@/features/gym-dashboard/components/StatCard";
import BarChart from "@/features/gym-dashboard/components/BarChart";
import DonutChart from "@/features/gym-dashboard/components/DonutChart";

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const GymInsightsPage: FC = () => (
  <div className="max-w-[1600px] animate-fade-in">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
          <span className="inline-block h-px w-4 bg-orange-500" />Analytics
        </p>
        <h1 className="text-xl font-black uppercase tracking-tight">Business <span className="text-gradient-fire">Insights</span></h1>
        <p className="mt-1 text-[11px] text-zinc-600">Traffic patterns, retention signals, and performance trends</p>
      </div>
      <div className="flex items-center gap-2">
        <select className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white outline-none focus:border-orange-500/40">
          <option>Last 30 days</option><option>Last 7 days</option><option>This year</option>
        </select>
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Export</button>
      </div>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Repeat Visit Rate" value="69.7%" up />
      <StatCard label="Avg Visits / Member" value="18.4" />
      <StatCard label="Profile → Visit CVR" value="6.8%" sub="1,240 views" />
      <StatCard label="Avg Session Length" value="52 min" />
    </div>

    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Daily Check-in Trend (Mar)</p>
        <BarChart data={[
          { label: "1", h: 40 }, { label: "3", h: 55 }, { label: "5", h: 48 }, { label: "7", h: 70 },
          { label: "9", h: 62 }, { label: "11", h: 78 }, { label: "13", h: 55 }, { label: "15", h: 82 },
          { label: "17", h: 75 }, { label: "19", h: 90 }, { label: "21", h: 84, today: true },
        ]} />
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Busiest Hours</p>
        <div className="mt-1 grid grid-cols-12 gap-1">
          {["6am", "7am", "8am", "9am", "10am", "11am", "12pm", "1pm", "5pm", "6pm", "7pm", "8pm"].map((h, i) => {
            const ix = [0.2, 0.5, 0.9, 0.7, 0.4, 0.3, 0.15, 0.2, 0.7, 1, 0.75, 0.4][i];
            return (
              <div key={h} className="text-center">
                <div className="mb-1 rounded" style={{ height: 36, background: `rgba(249,115,22,${ix})` }} />
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[7px] text-zinc-600">{h}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2.5 text-[10px] text-zinc-600">
          Peak: <strong className="text-orange-500">6–7 PM</strong> · Quiet: <strong className="text-zinc-600">12–1 PM</strong>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Retention</p>
        <div className="flex justify-center">
          <DonutChart
            gradient="conic-gradient(#4ade80 0% 70%, rgba(255,255,255,0.05) 70% 100%)"
            centerLabel="70%"
            legends={[
              { color: "#4ade80", label: "Retained" },
              { color: "rgba(255,255,255,0.08)", label: "Churned" },
            ]}
          />
        </div>
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Rating Distribution</p>
        {[5, 4, 3, 2, 1].map(r => {
          const c = [45, 35, 12, 5, 3][5 - r];
          return (
            <div key={r} className="mb-2 flex items-center gap-2">
              <span className="w-3.5 text-[10px]" style={{ color: r >= 4 ? "#4ade80" : r === 3 ? "#fbbf24" : "#ef4444" }}>{r}★</span>
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${c}%`, background: r >= 4 ? "#4ade80" : r === 3 ? "#fbbf24" : "#ef4444" }} />
              </div>
              <span className="w-6 text-right text-[9px] text-zinc-600">{c}%</span>
            </div>
          );
        })}
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Churn Risk</p>
        {[
          { t: "Sunita Gurung – no visit 7d", c: "border-red-400/25 bg-red-400/[0.12] text-red-400" },
          { t: "Rajan Koirala – pass expiring", c: "border-orange-500/25 bg-orange-500/[0.12] text-orange-500" },
          { t: "Dev Adhikari – inactive 2 weeks", c: "border-red-400/25 bg-red-400/[0.12] text-red-400" },
        ].map((r, i) => (
          <div key={i} className="relative mb-2 flex gap-2.5 py-2">
            {i < 2 && <div className="absolute bottom-0 left-[7px] top-7 w-px bg-white/[0.04]" />}
            <div className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border text-[7px] ${r.c}`}>!</div>
            <div className="flex-1 text-[11px] font-medium leading-relaxed text-gray-300">{r.t}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default GymInsightsPage;
