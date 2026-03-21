import type { FC } from "react";

interface BarData {
  label: string;
  h: number;
  today?: boolean;
}

interface BarChartProps {
  data: BarData[];
}

const BarChart: FC<BarChartProps> = ({ data }) => (
  <div>
    <div className="flex items-end gap-1.5" style={{ height: 72, paddingTop: 6 }}>
      {data.map((d, i) => (
        <div
          key={i}
          className={`min-w-0 flex-1 rounded-t transition-colors ${
            d.today
              ? "bg-orange-500 border border-orange-500"
              : "bg-orange-500/[0.12] border border-orange-500/20 hover:bg-orange-500/30"
          }`}
          style={{ height: `${d.h}%` }}
        />
      ))}
    </div>
    <div className="mt-1 flex gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[8px] text-zinc-600">
          {d.label}
        </div>
      ))}
    </div>
  </div>
);

export default BarChart;
