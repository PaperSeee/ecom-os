import { AlertTriangle, Info, Siren } from "lucide-react";

interface AlertBannerProps {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

const styles = {
  critical: {
    wrap: "border-rose-500/40 bg-rose-500/10 text-rose-100",
    icon: Siren,
  },
  warning: {
    wrap: "border-amber-400/40 bg-amber-500/10 text-amber-100",
    icon: AlertTriangle,
  },
  info: {
    wrap: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100",
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
