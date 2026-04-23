import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  CheckCircle2,
  Cpu,
  HardDrive,
  Loader2,
  Monitor,
  Network,
  ShieldCheck,
  Sparkles,
  Server,
  TextCursorInput,
} from "lucide-react";
import api from "../lib/api";
import { VmTemplate } from "../types";
import toast from "react-hot-toast";
import {
  RequestActionBar,
  RequestChip,
  RequestPanel,
  RequestSelectableCard,
  RequestStat,
  RequestStepHeader,
} from "../components/RequestFlow";

type RequestType = "VM" | "VDI";

type FormState = {
  title: string;
  justification: string;
};

const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Config" },
  { id: 3, label: "Review" },
];

const REQUEST_TYPE_OPTIONS: Array<{
  id: RequestType;
  title: string;
  description: string;
  tag: string;
  icon: React.ReactNode;
}> = [
  {
    id: "VM",
    title: "VM / VDI Provisioning",
    description:
      "Provision infrastructure-ready compute for applications, test systems, or persistent team workloads.",
    tag: "High priority available",
    icon: <Server size={24} />,
  },
  {
    id: "VDI",
    title: "Secure Virtual Desktop",
    description:
      "Request managed desktop access for analysts, operators, or contractors who need isolated workspaces.",
    tag: "Security review ready",
    icon: <Monitor size={24} />,
  },
];

const NewRequest: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ title: "", justification: "" });

  const { data: templates, isLoading: isTemplatesLoading } = useQuery<VmTemplate[]>({
    queryKey: ["request-templates"],
    queryFn: async () => {
      const response = await api.get("/templates/");
      return response.data;
    },
  });

  const activeTemplates = useMemo(
    () => (templates || []).filter((template) => template.is_active),
    [templates]
  );

  const selectedTemplate =
    activeTemplates.find((template) => template.id === selectedTemplateId) || null;

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!requestType || !selectedTemplateId) {
        throw new Error("Missing required fields");
      }

      const response = await api.post("/requests/", {
        title: formState.title.trim(),
        justification: formState.justification.trim() || "N/A",
        template_id: selectedTemplateId,
        request_type: requestType,
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("Request submitted successfully");
      navigate("/requests");
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to submit request");
    },
  });

  const canContinueFromType = Boolean(requestType);
  const canContinueFromConfig = Boolean(selectedTemplateId && formState.title.trim());
  const canSubmit = canContinueFromConfig && Boolean(requestType);

  const handleNext = () => {
    if (step === 1 && canContinueFromType) {
      setStep(2);
    }

    if (step === 2 && canContinueFromConfig) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep((current) => Math.max(1, current - 1));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    createRequest.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="request-shell animate-fade-in-up">
      <RequestStepHeader currentStep={step} steps={STEPS} />

      <div className="relative z-10 space-y-8">
        {step === 1 && (
          <RequestPanel className="p-6 md:p-10">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan/80">
                New request
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                What do you need?
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/50 md:text-base">
                Select the service track you want us to provision. This first pass keeps the
                backend workflow unchanged while giving the request journey a more guided UI.
              </p>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-2">
              {REQUEST_TYPE_OPTIONS.map((option) => (
                <RequestSelectableCard
                  key={option.id}
                  title={option.title}
                  description={option.description}
                  icon={option.icon}
                  tag={option.tag}
                  selected={requestType === option.id}
                  onClick={() => setRequestType(option.id)}
                  chips={option.id === "VM" ? ["Rapid deployment"] : ["Managed access"]}
                />
              ))}
            </div>

            <RequestActionBar
              nextLabel="Continue"
              onNext={handleNext}
              nextDisabled={!canContinueFromType}
            />
          </RequestPanel>
        )}

        {step === 2 && (
          <RequestPanel className="p-6 md:p-10">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan/80">
                  Configuration
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Choose a template
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
                  Pick an active template from the current catalog, then give the request a clear
                  title and a short business justification.
                </p>

                <div className="mt-10 grid gap-5 lg:grid-cols-2">
                  {isTemplatesLoading && (
                    <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-[26px] border border-white/8 bg-[#111726]/80 text-white/50">
                      <Loader2 className="mr-3 animate-spin text-cyan" size={18} />
                      Loading active templates...
                    </div>
                  )}

                  {!isTemplatesLoading && activeTemplates.length === 0 && (
                    <div className="col-span-full rounded-[26px] border border-white/8 bg-[#111726]/80 p-8 text-white/55">
                      <Boxes className="mb-4 text-cyan" size={28} />
                      <h2 className="text-xl font-semibold text-white">No active templates found</h2>
                      <p className="mt-3 max-w-lg text-sm leading-6 text-white/45">
                        The request flow is ready, but there are no active templates available to
                        provision right now. Activate a template in admin before submitting a new
                        request.
                      </p>
                    </div>
                  )}

                  {activeTemplates.map((template) => (
                    <RequestSelectableCard
                      key={template.id}
                      title={template.name}
                      description={
                        template.description ||
                        `${template.os} image for ${requestType === "VDI" ? "desktop access" : "infrastructure workloads"}.`
                      }
                      icon={template.os_type.toLowerCase().includes("windows") ? <Monitor size={24} /> : <Server size={24} />}
                      selected={selectedTemplateId === template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      tag={template.os_type}
                      chips={[`${template.cpu} vCPU`, `${template.ram_gb} GB RAM`, `${template.disk_gb} GB Disk`]}
                    />
                  ))}
                </div>

                <div className="mt-8 grid gap-5 rounded-[28px] border border-white/8 bg-[#151a2b]/95 p-5 md:grid-cols-2 md:p-6">
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="request-title"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/35"
                      >
                        Request title
                      </label>
                      <div className="relative">
                        <TextCursorInput
                          size={16}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        />
                        <input
                          id="request-title"
                          value={formState.title}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          className="glass-input py-3 pl-11"
                          placeholder="e.g. Aurora analytics workspace"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <RequestStat
                        label="Service"
                        value={requestType === "VDI" ? "Virtual desktop" : "Virtual machine"}
                      />
                      <RequestStat
                        label="Template"
                        value={selectedTemplate ? selectedTemplate.name : "Pick one"}
                      />
                      <RequestStat
                        label="OS"
                        value={selectedTemplate ? selectedTemplate.os : "Waiting"}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="request-justification"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/35"
                    >
                      Business justification
                    </label>
                    <textarea
                      id="request-justification"
                      value={formState.justification}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          justification: event.target.value,
                        }))
                      }
                      rows={7}
                      className="glass-input min-h-[176px] resize-none"
                      placeholder="Briefly describe the operational need for this request..."
                    />
                    <p className="mt-2 text-xs text-white/30">
                      We keep this optional in the payload, but including context helps approvals
                      move faster.
                    </p>
                  </div>
                </div>
              </div>

              <RequestPanel className="h-fit p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan/80">
                  Selected path
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-white">Ready for review</h2>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  The final step packages the selected template with your request name and business
                  context, then routes it through the existing approval pipeline.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-cyan/15 bg-cyan/5 p-5">
                    <div className="flex items-center gap-3 text-cyan">
                      <Sparkles size={18} />
                      <span className="text-sm font-semibold text-white">
                        {requestType === "VDI" ? "VDI workflow selected" : "VM workflow selected"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/45">
                      {requestType === "VDI"
                        ? "Ideal for isolated desktop access with centrally managed compute."
                        : "Optimized for application hosting, sandboxing, and persistent infrastructure."}
                    </p>
                  </div>

                  <div className="space-y-3 rounded-3xl border border-white/8 bg-[#101626] p-5">
                    <div className="flex items-center gap-3 text-white">
                      <Network size={16} className="text-cyan" />
                      <span className="text-sm font-semibold">Live template data</span>
                    </div>
                    <p className="text-sm leading-6 text-white/45">
                      Specs shown here are pulled directly from active templates in the platform, so
                      this view stays aligned with provisioning reality.
                    </p>
                  </div>
                </div>
              </RequestPanel>
            </div>

            <RequestActionBar
              backLabel="Back"
              onBack={handleBack}
              nextLabel="Continue to review"
              onNext={handleNext}
              nextDisabled={!canContinueFromConfig}
            />
          </RequestPanel>
        )}

        {step === 3 && (
          <RequestPanel className="p-6 md:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan/80">
                Review
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Review your request
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/50 md:text-base">
                Confirm the selected service type, template, and request context before submitting
                to the existing approval workflow.
              </p>
            </div>

            <div className="mt-12 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
              <RequestPanel className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="request-card-icon">
                      {requestType === "VDI" ? <Monitor size={24} /> : <Server size={24} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold text-white">{formState.title}</h2>
                        <RequestChip
                          label={requestType === "VDI" ? "VM / VDI" : "VM"}
                          variant="cyan"
                        />
                      </div>
                      <p className="mt-2 text-sm text-white/35">
                        Template-backed provisioning request routed through the current approval
                        process.
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="text-teal" size={26} />
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Justification
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/70">
                      {formState.justification.trim() || "No additional justification provided."}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RequestStat
                      label="Template"
                      value={selectedTemplate ? selectedTemplate.name : "Unavailable"}
                    />
                    <RequestStat
                      label="Operating system"
                      value={selectedTemplate ? selectedTemplate.os : "Unavailable"}
                    />
                    <RequestStat
                      label="Template type"
                      value={selectedTemplate ? selectedTemplate.os_type : "Unavailable"}
                    />
                    <RequestStat
                      label="Request type"
                      value={requestType === "VDI" ? "Virtual desktop" : "Virtual machine"}
                    />
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="mt-8 rounded-[24px] border border-white/8 bg-[#0e1322] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Template specs
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <Cpu size={16} className="text-cyan" />
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                          vCPU
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {selectedTemplate.cpu} Core
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <Boxes size={16} className="text-cyan" />
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                          RAM
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {selectedTemplate.ram_gb} GB
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <HardDrive size={16} className="text-cyan" />
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                          Storage
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {selectedTemplate.disk_gb} GB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </RequestPanel>

              <div className="space-y-6">
                <RequestPanel className="p-6">
                  <h2 className="text-xl font-semibold text-white">What happens next</h2>
                  <div className="mt-6 space-y-5">
                    {[
                      {
                        title: "Request submitted",
                        description: "The request enters the existing approval queue immediately.",
                        active: true,
                      },
                      {
                        title: "Team Lead approval",
                        description: "Initial validation confirms the request is business aligned.",
                      },
                      {
                        title: "IT approval",
                        description: "The provisioning team starts the infrastructure workflow.",
                      },
                      {
                        title: "Provisioning",
                        description: "The selected template is provisioned in the current backend flow.",
                      },
                    ].map((item, index) => (
                      <div key={item.title} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                              item.active
                                ? "border-cyan/50 bg-cyan/15 text-cyan"
                                : "border-white/10 bg-white/[0.03] text-white/35"
                            }`}
                          >
                            {index + 1}
                          </div>
                          {index < 3 && <div className="mt-2 h-8 w-px bg-white/10" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-white/45">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </RequestPanel>

                <RequestPanel className="p-6">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-1 text-cyan" />
                    <div>
                      <p className="text-sm font-semibold text-white">Submission note</p>
                      <p className="mt-2 text-sm leading-6 text-white/45">
                        This release keeps the existing backend contract unchanged. The richer UI is
                        a presentation upgrade around the same request creation API.
                      </p>
                    </div>
                  </div>
                </RequestPanel>
              </div>
            </div>

            <RequestActionBar
              backLabel="Back to configuration"
              onBack={handleBack}
              nextLabel={createRequest.isPending ? "Submitting..." : "Submit request"}
              nextDisabled={!canSubmit || createRequest.isPending}
              nextType="submit"
            />
          </RequestPanel>
        )}
      </div>
    </form>
  );
};

export default NewRequest;
