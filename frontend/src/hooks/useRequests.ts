import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { VmRequest, NewRequestData } from "../types";
import toast from "react-hot-toast";

export const useRequests = () => {
  const queryClient = useQueryClient();

  const useAllRequests = () => useQuery<VmRequest[]>({
    queryKey: ["requests"],
    queryFn: async () => {
      const resp = await api.get("/requests");
      return resp.data;
    },
  });

  const useRequest = (id?: string) => useQuery<VmRequest>({
    queryKey: ["request", id],
    queryFn: async () => {
      const resp = await api.get(`/requests/${id}`);
      return resp.data;
    },
    enabled: !!id,
  });

  const createRequest = useMutation({
    mutationFn: (data: NewRequestData) => api.post("/requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Provisioning request submitted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Submission failed");
    },
  });

  return { useAllRequests, useRequest, createRequest };
};
