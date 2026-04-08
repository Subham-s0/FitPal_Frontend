import type { FC } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/shared/lib/utils";

export interface AnalyticsPieDatum {
  label: string;
  value: number;
  color: string;
  meta?: string;
}

interface AnalyticsPieChartProps {
  data: AnalyticsPieDatum[];
  centerLabel: string;
  centerSubLabel?: string;
  emptyLabel?: string;
  className?: string;
}

const tooltipStyle = {
  backgroundColor: "#0a0a0a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#fafafa",
  fontSize: 11,
};

const getAdaptiveChartMetrics = (data: AnalyticsPieDatum[]) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return {
      chartSize: 136,
      innerRadius: 30,
      outerRadius: 46,
    };
  }

  const maxShare = Math.max(...data.map((item) => item.value / total));
  const scale = maxShare >= 0.7 ? 1.15 : maxShare >= 0.45 ? 1.08 : 1;

  return {
    chartSize: Math.round(136 * scale),
    innerRadius: Math.round(30 * scale),
    outerRadius: Math.round(46 * scale),
  };
};

const AnalyticsPieChart: FC<AnalyticsPieChartProps> = ({
  data,
  centerLabel,
  centerSubLabel,
  emptyLabel = "No data",
  className,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const chartData = hasData
    ? data.filter((item) => item.value > 0)
    : [{ label: emptyLabel, value: 1, color: "rgba(255,255,255,0.08)" }];
  const { chartSize, innerRadius, outerRadius } = getAdaptiveChartMetrics(chartData);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-center sm:justify-center",
        className
      )}
    >
      <div
        className="relative mx-auto shrink-0"
        style={{
          height: chartSize,
          width: chartSize,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={chartData.length > 1 ? 2 : 0}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={tooltipStyle}
              itemStyle={{ color: "#fafafa" }}
              labelStyle={{ color: "#d4d4d8" }}
              formatter={(value: string | number, name: string | number) => [String(value), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[21px] font-black leading-none text-white">{centerLabel}</p>
          {centerSubLabel ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              {centerSubLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid w-full max-w-[240px] gap-2">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2"
          >
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-white">{item.label}</p>
              {item.meta ? <p className="text-[10px] text-zinc-400">{item.meta}</p> : null}
            </div>
            <p className="ml-auto text-[11px] font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPieChart;
