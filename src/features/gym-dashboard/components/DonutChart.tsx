import type { FC } from "react";

interface DonutLegend {
  color: string;
  label: string;
}

interface DonutChartProps {
  /** CSS conic-gradient value, e.g. "conic-gradient(#f97316 0% 15%, rgba(255,255,255,0.05) 15% 100%)" */
  gradient: string;
  centerLabel: string;
  legends: DonutLegend[];
}

const DonutChart: FC<DonutChartProps> = ({ gradient, centerLabel, legends }) => (
  <div className="flex items-center gap-4">
    <div
      className="relative flex h-[66px] w-[66px] flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: gradient }}
    >
      <div className="absolute h-[46px] w-[46px] rounded-full bg-[#0c0c0c]" />
      <span className="relative z-10 text-xs font-black text-white">{centerLabel}</span>
    </div>
    <div className="flex flex-col gap-1.5">
      {legends.map((l, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full" style={{ background: l.color }} />
          {l.label}
        </div>
      ))}
    </div>
  </div>
);

export default DonutChart;
