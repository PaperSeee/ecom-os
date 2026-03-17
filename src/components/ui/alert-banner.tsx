import { AlertTriangle, Info, Siren } from "lucide-react";

interface AlertBannerProps {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

const styles = {
  critical: {
    wrap: "border-red-200 bg-red-50 text-red-900 shadow-[0_1px_3px_rgba(239,68,68,0.1)]",
    icon: Siren,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900 shadow-[0_1px_3px_rgba(251,146,60,0.1)]",
    icon: AlertTriangle,
  },
  info: {
    wrap: "border-blue-200 bg-blue-50 text-blue-900 shadow-[0_1px_3px_rgba(59,130,246,0.1)]",
    icon: Info,
  },
};

export const AlertBanner = ({ title, description, severity }: AlertBannerProps) => {
  const Icon = styles[severity].icon;

  return (
    <section className={`rounded-xl border px-4 py-3 ${styles[severity].wrap}`} role="alert" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm opacity-90">{description}</p>
        </div>
      </div>
    </section>
  );
};
