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
}

interface CashFlowChartProps {
  rows: CashFlowChartRow[];
}

export default function CashFlowChart({ rows }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "0.75rem",
            borderColor: "#3f3f46",
            backgroundColor: "#09090b",
            color: "#fafafa",
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
      </LineChart>
    </ResponsiveContainer>
  );
}
