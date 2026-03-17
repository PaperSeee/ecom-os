"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  label: string;
  revenue: number;
  spend: number;
  profit: number;
}

interface PerformanceChartProps {
  data: Point[];
}

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
  return (
    <div className="h-[260px] min-h-[260px] w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
        <LineChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "rgba(255,255,255,0.16)",
              backgroundColor: "rgba(2,6,23,0.95)",
              color: "#fff",
            }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2.2} dot={false} />
          <Line type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
