interface ProgressBarProps {
  value: number;
  label?: string;
}

export const ProgressBar = ({ value, label }: ProgressBarProps) => {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-2" aria-label={label ?? "Progression"}>
      {label ? (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span>{safeValue}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full rounded-full bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};
