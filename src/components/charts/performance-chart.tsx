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
    <div className="fin-panel h-[260px] min-h-[260px] w-full p-3">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
        <LineChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.22)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#cbd5e1",
              backgroundColor: "#ffffff",
              color: "#0f172a",
            }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2.4} dot={false} />
          <Line type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2.1} dot={false} />
          <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
