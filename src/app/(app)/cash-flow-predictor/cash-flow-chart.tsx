"use client";

import { formatCurrency } from "@/lib/financial";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CashFlowChartRow {
  label: string;
  pessimistic: number;
  base: number;
  aggressive: number;
  mcP10?: number;
  mcP50?: number;
  mcP90?: number;
}

interface CashFlowChartProps {
  rows: CashFlowChartRow[];
}

export default function CashFlowChart({ rows }: CashFlowChartProps) {
  const hasMonteCarlo = rows.some((row) =>
    typeof row.mcP10 === "number" && typeof row.mcP50 === "number" && typeof row.mcP90 === "number",
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
        <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "0.75rem",
            borderColor: "#e2e8f0",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          }}
          formatter={(value) => {
            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
            return formatCurrency(Number.isFinite(numericValue) ? numericValue : 0);
          }}
        />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="pessimistic" name="Pessimiste" stroke="#f97316" strokeWidth={2.2} dot={false} />
        <Line type="monotone" dataKey="base" name="Base" stroke="#22c55e" strokeWidth={2.8} dot={false} />
        <Line type="monotone" dataKey="aggressive" name="Agressif" stroke="#38bdf8" strokeWidth={2.2} dot={false} />
        {hasMonteCarlo ? (
          <>
            <Line type="monotone" dataKey="mcP10" name="MC P10" stroke="#f43f5e" strokeWidth={1.8} strokeDasharray="5 4" dot={false} />
            <Line type="monotone" dataKey="mcP50" name="MC P50" stroke="#eab308" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            <Line type="monotone" dataKey="mcP90" name="MC P90" stroke="#818cf8" strokeWidth={1.8} strokeDasharray="5 4" dot={false} />
          </>
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}
