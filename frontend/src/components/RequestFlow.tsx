import React from "react";
import { Check, ChevronRight } from "lucide-react";

type Step = {
  id: number;
  label: string;
};

type RequestStepHeaderProps = {
  currentStep: number;
  steps: Step[];
};

export const RequestStepHeader: React.FC<RequestStepHeaderProps> = ({
  currentStep,
  steps,
}) => {
  return (
    <div className="request-stepper">
      {steps.map((step, index) => {
        const isComplete = currentStep > step.id;
        const isCurrent = currentStep === step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex min-w-0 flex-col items-center gap-3 text-center">
              <div
                className={`request-step-badge ${
                  isComplete || isCurrent ? "request-step-badge-active" : ""
                }`}
              >
                {isComplete ? <Check size={14} /> : String(step.id).padStart(2, "0")}
              </div>
              <div>
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.28em] ${
                    isComplete || isCurrent ? "text-cyan" : "text-white/35"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`hidden h-px flex-1 md:block ${
                  currentStep > step.id ? "bg-cyan/80" : "bg-white/10"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

type RequestPanelProps = {
  className?: string;
  children: React.ReactNode;
};

export const RequestPanel: React.FC<RequestPanelProps> = ({ className = "", children }) => {
  return <section className={`request-panel ${className}`.trim()}>{children}</section>;
};

type RequestSelectableCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  tag?: string;
  chips?: string[];
};

export const RequestSelectableCard: React.FC<RequestSelectableCardProps> = ({
  title,
  description,
  icon,
  selected = false,
  onClick,
  tag,
  chips = [],
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`request-card text-left ${selected ? "request-card-selected" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="request-card-icon">{icon}</div>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-cyan transition-all ${
            selected
              ? "border-cyan/80 bg-cyan/20 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              : "border-white/10 bg-white/[0.03] text-white/20"
          }`}
        >
          <Check size={14} />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">{description}</p>
      </div>

      {(tag || chips.length > 0) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tag ? <RequestChip label={tag} variant={selected ? "cyan" : "default"} /> : null}
          {chips.map((chip) => (
            <RequestChip key={chip} label={chip} />
          ))}
        </div>
      )}
    </button>
  );
};

type RequestChipProps = {
  label: string;
  variant?: "default" | "cyan" | "teal";
};

export const RequestChip: React.FC<RequestChipProps> = ({
  label,
  variant = "default",
}) => {
  const variantClassName =
    variant === "cyan"
      ? "border-cyan/30 bg-cyan/10 text-cyan"
      : variant === "teal"
        ? "border-teal/30 bg-teal/10 text-teal"
        : "border-white/10 bg-white/[0.04] text-white/45";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${variantClassName}`}
    >
      {label}
    </span>
  );
};

type RequestStatProps = {
  label: string;
  value: string;
};

export const RequestStat: React.FC<RequestStatProps> = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1224]/80 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
};

type RequestActionBarProps = {
  backLabel?: string;
  onBack?: () => void;
  nextLabel: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
};

export const RequestActionBar: React.FC<RequestActionBarProps> = ({
  backLabel = "Back",
  onBack,
  nextLabel,
  onNext,
  nextDisabled = false,
  nextType = "button",
}) => {
  return (
    <div className="request-action-bar">
      <div>
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-ghost inline-flex items-center gap-2">
            {backLabel}
          </button>
        ) : (
          <div />
        )}
      </div>

      <button
        type={nextType}
        onClick={onNext}
        disabled={nextDisabled}
        className="request-primary-button"
      >
        <span>{nextLabel}</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
