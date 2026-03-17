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
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isCurrent
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-500"
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
