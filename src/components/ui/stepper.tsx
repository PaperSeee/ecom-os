interface StepperProps {
  steps: string[];
  currentStep: number;
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Launch steps">
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <li
            key={step}
            className={`rounded-xl border px-3 py-3 text-sm transition-colors ${
              isDone
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : isCurrent
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-white/10 bg-slate-900/80 text-slate-400"
            }`}
          >
            <span className="text-xs uppercase tracking-wide opacity-70">Etape {index + 1}</span>
            <p className="mt-1">{step}</p>
          </li>
        );
      })}
    </ol>
  );
};
