import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Clock3,
  HardDrive,
  KeyRound,
  Loader2,
  Monitor,
  Network,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "../lib/api";
import { User, VmRequest } from "../types";
import toast from "react-hot-toast";
import StatusBadge from "../components/StatusBadge";
import {
  RequestChip,
  RequestPanel,
  RequestStat,
  RequestStepHeader,
} from "../components/RequestFlow";

const REVIEW_STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Config" },
  { id: 3, label: "Review" },
];

const RequestDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const [note, setNote] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  const { data: req, isLoading } = useQuery<VmRequest>({
    queryKey: ["request", id],
    queryFn: async () => {
      const response = await api.get(`/requests/${id}`);
      return response.data;
    },
    refetchInterval: (query) => (query.state.data?.status === "PROVISIONING" ? 10000 : false),
  });

  const fetchCredentials = async () => {
    if (req?.status !== "ACTIVE") {
      return;
    }

    try {
      const response = await api.get(`/requests/${id}/credentials`);
      setCredentials(response.data);
      setShowPassword(true);
    } catch {
      toast.error("Failed to fetch credentials");
    }
  };

  const approveTL = useMutation({
    mutationFn: () => api.post(`/requests/${id}/approve-tl`, { note }),
    onSuccess: () => {
      toast.success("Approved by Team Lead");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    },
  });

  const approveIT = useMutation({
    mutationFn: () => api.post(`/requests/${id}/approve-it`, { note }),
    onSuccess: () => {
      toast.success("Provisioning started");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    },
  });

  const reject = useMutation({
    mutationFn: () => api.post(`/requests/${id}/reject`, { note }),
    onSuccess: () => {
      toast.error("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    },
  });

  const isTL = user.role === "TEAM_LEAD" || user.role === "ADMIN";
  const isIT = user.role === "IT_TEAM" || user.role === "ADMIN";

  const nextSteps = useMemo(() => {
    if (!req) {
      return [];
    }

    return [
      {
        title: "You",
        description: "Request submitted",
        active: true,
        complete: true,
      },
      {
        title: "Team Lead approval",
        description: req.tl_approved_at ? "Approved" : "Business validation",
        active: req.status === "PENDING_TL",
        complete: Boolean(req.tl_approved_at),
      },
      {
        title: "IT approval",
        description: req.it_approved_at ? "Approved" : "Security and provisioning handoff",
        active: req.status === "PENDING_IT",
        complete: Boolean(req.it_approved_at),
      },
      {
        title: "Provisioning",
        description:
          req.status === "PROVISIONING"
            ? "In progress"
            : req.status === "ACTIVE"
              ? "Completed"
              : "Queued",
        active: req.status === "PROVISIONING",
        complete: req.status === "ACTIVE",
      },
      {
        title: "VM ready",
        description: req.status === "ACTIVE" ? "Login details available" : "Waiting for completion",
        active: req.status === "ACTIVE",
        complete: req.status === "ACTIVE",
      },
    ];
  }, [req]);

  if (isLoading || !req) {
    return (
      <div className="request-shell">
        <RequestPanel className="flex min-h-[320px] items-center justify-center p-10 text-white/45">
          <Loader2 className="mr-3 animate-spin text-cyan" size={18} />
          Loading request details...
        </RequestPanel>
      </div>
    );
  }

  const templateType = req.request_type || (req.template?.os_type.toLowerCase().includes("windows") ? "VDI" : "VM");

  return (
    <div className="request-shell animate-fade-in-up">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/45 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <RequestStepHeader currentStep={3} steps={REVIEW_STEPS} />

      <div className="space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Review your request
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/50 md:text-base">
            Track the current status, review the selected template, and complete approval or
            provisioning actions without changing the underlying workflow.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <RequestPanel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="request-card-icon">
                    {templateType === "VDI" ? <Monitor size={24} /> : <Network size={24} />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-white">{req.title}</h2>
                      <RequestChip label={templateType === "VDI" ? "VM / VDI" : "VM"} variant="cyan" />
                    </div>
                    <p className="mt-2 text-sm text-white/35">Request ID: {req.id}</p>
                  </div>
                </div>
                <StatusBadge status={req.status} />
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Justification
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/70">{req.justification}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RequestStat
                    label="Template"
                    value={req.template?.name || "Unavailable"}
                  />
                  <RequestStat
                    label="Operating system"
                    value={req.template?.os || "Unavailable"}
                  />
                  <RequestStat
                    label="Requester"
                    value={req.requester?.name || "Unknown"}
                  />
                  <RequestStat
                    label="Created"
                    value={new Date(req.created_at).toLocaleDateString()}
                  />
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-white/8 bg-[#0e1322] p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <Network size={16} className="text-cyan" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Service type
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {templateType === "VDI" ? "Virtual desktop" : "Virtual machine"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <Boxes size={16} className="text-cyan" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      RAM
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {req.template?.ram_gb ? `${req.template.ram_gb} GB` : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <HardDrive size={16} className="text-cyan" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      Disk
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {req.template?.disk_gb ? `${req.template.disk_gb} GB` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </RequestPanel>

            {req.status === "ACTIVE" && (
              <RequestPanel className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Access credentials</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      Reveal the current VM or VDI login details from the backend when needed.
                    </p>
                  </div>

                  {!showPassword ? (
                    <button onClick={fetchCredentials} type="button" className="request-primary-button min-w-0 px-5 py-3">
                      <span>Reveal credentials</span>
                      <KeyRound size={16} />
                    </button>
                  ) : (
                    <button onClick={() => setShowPassword(false)} type="button" className="btn-ghost">
                      Hide details
                    </button>
                  )}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <RequestStat
                    label="IP address"
                    value={req.ip_address || credentials?.ip_address || "N/A"}
                  />
                  <RequestStat
                    label="VM ID"
                    value={String(req.proxmox_vm_id || credentials?.vm_id || "N/A")}
                  />
                  <RequestStat
                    label="Node"
                    value={req.proxmox_node || credentials?.proxmox_node || "N/A"}
                  />
                  <RequestStat
                    label="MAC address"
                    value={req.mac_address || "N/A"}
                  />
                  <RequestStat
                    label="Username"
                    value={req.vm_username || credentials?.vm_username || "admin"}
                  />
                  <RequestStat
                    label="Password"
                    value={
                      showPassword
                        ? req.vm_password || credentials?.vm_password || "N/A"
                        : "Hidden until revealed"
                    }
                  />
                </div>

                {req.glpi_ticket_id && (
                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      GLPI ticket
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{req.glpi_ticket_id}</p>
                  </div>
                )}
              </RequestPanel>
            )}
          </div>

          <div className="space-y-6">
            <RequestPanel className="p-6">
              <h3 className="text-xl font-semibold text-white">What happens next</h3>
              <div className="mt-6 space-y-5">
                {nextSteps.map((item, index) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                          item.complete
                            ? "border-teal/40 bg-teal/10 text-teal"
                            : item.active
                              ? "border-cyan/40 bg-cyan/10 text-cyan"
                              : "border-white/10 bg-white/[0.03] text-white/30"
                        }`}
                      >
                        {item.complete ? <CheckCircle2 size={16} /> : index + 1}
                      </div>
                      {index < nextSteps.length - 1 && <div className="mt-2 h-8 w-px bg-white/10" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/45">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RequestPanel>

            {(req.status === "PENDING_TL" && isTL) || (req.status === "PENDING_IT" && isIT) ? (
              <RequestPanel className="p-6">
                <h3 className="text-xl font-semibold text-white">
                  {req.status === "PENDING_TL" ? "Team Lead approval" : "IT provisioning"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {req.status === "PENDING_TL"
                    ? "Approve or reject this request without leaving the review view."
                    : "Trigger the existing provisioning workflow once this request is ready."}
                </p>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    req.status === "PENDING_TL"
                      ? "Add an approval note (optional)"
                      : "Add provisioning notes"
                  }
                  className="glass-input mt-5 min-h-[132px] resize-none"
                />

                {req.status === "PENDING_TL" ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => approveTL.mutate()}
                      disabled={approveTL.isPending}
                      className="request-primary-button min-w-0"
                    >
                      <span>{approveTL.isPending ? "Approving..." : "Approve"}</span>
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => reject.mutate()}
                      disabled={reject.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-6 py-4 font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                    >
                      <span>{reject.isPending ? "Rejecting..." : "Reject"}</span>
                      <XCircle size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => approveIT.mutate()}
                    disabled={approveIT.isPending}
                    className="request-primary-button mt-5 w-full min-w-0"
                  >
                    <span>{approveIT.isPending ? "Provisioning..." : "Start provisioning"}</span>
                    <ShieldCheck size={16} />
                  </button>
                )}
              </RequestPanel>
            ) : null}

            {req.status === "PROVISIONING" && (
              <RequestPanel className="p-6">
                <div className="flex items-start gap-3">
                  <Clock3 size={18} className="mt-1 text-cyan" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Provisioning in progress</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      The request is actively being created in the existing backend flow. This page
                      refreshes automatically while provisioning is running.
                    </p>
                  </div>
                </div>
              </RequestPanel>
            )}

            {req.status === "FAILED" && (
              <RequestPanel className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-1 text-rose-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Provisioning failed</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      {req.error_message || "The backend did not return a specific error message."}
                    </p>
                  </div>
                </div>

                {isIT && (
                  <button
                    type="button"
                    onClick={() => approveIT.mutate()}
                    className="request-primary-button mt-5 w-full min-w-0"
                  >
                    <span>{approveIT.isPending ? "Retrying..." : "Retry provisioning"}</span>
                    <ShieldCheck size={16} />
                  </button>
                )}
              </RequestPanel>
            )}

            {req.status === "REJECTED" && (
              <RequestPanel className="p-6">
                <div className="flex items-start gap-3">
                  <XCircle size={18} className="mt-1 text-rose-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Request rejected</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      This request has been rejected in the current approval workflow. Review the
                      note history or submit a revised request if needed.
                    </p>
                  </div>
                </div>
              </RequestPanel>
            )}

            <RequestPanel className="p-6">
              <h3 className="text-xl font-semibold text-white">Request metadata</h3>
              <div className="mt-5 grid gap-3">
                <RequestStat label="Requester email" value={req.requester?.email || "N/A"} />
                <RequestStat label="Requester role" value={req.requester?.role || "N/A"} />
                <RequestStat label="Team Lead note" value={req.tl_note || "No note recorded"} />
                <RequestStat label="IT note" value={req.it_note || "No note recorded"} />
                <RequestStat label="Updated" value={new Date(req.updated_at).toLocaleString()} />
              </div>
            </RequestPanel>

            <RequestPanel className="p-6">
              <div className="flex items-start gap-3">
                <UserRound size={18} className="mt-1 text-cyan" />
                <div>
                  <h3 className="text-xl font-semibold text-white">Current owner</h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">
                    {req.status === "PENDING_TL"
                      ? "Waiting for Team Lead approval."
                      : req.status === "PENDING_IT" || req.status === "PROVISIONING"
                        ? "Owned by the IT provisioning workflow."
                        : req.status === "ACTIVE"
                          ? "Ready for requester access."
                          : "No active owner at the moment."}
                  </p>
                </div>
              </div>
            </RequestPanel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
