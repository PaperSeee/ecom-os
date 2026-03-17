import type { Trend } from "@/types/domain";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  trend: Trend;
  trendValue: string;
}

const trendClass: Record<Trend, string> = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
};

const TrendIcon = ({ trend }: { trend: Trend }) => {
  if (trend === "up") {
    return <ArrowUpRight className="h-4 w-4" aria-hidden="true" />;
  }

  if (trend === "down") {
    return <ArrowDownRight className="h-4 w-4" aria-hidden="true" />;
  }

  return <Minus className="h-4 w-4" aria-hidden="true" />;
};

export const StatsCard = ({ label, value, trend, trendValue }: StatsCardProps) => {
  return (
    <article className="fin-card rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-0.5">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className={`mt-2 inline-flex items-center gap-1 text-sm ${trendClass[trend]}`}>
        <TrendIcon trend={trend} />
        {trendValue}
      </p>
    </article>
  );
};
