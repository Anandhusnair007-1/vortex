export type UserRole = "EMPLOYEE" | "TEAM_LEAD" | "IT_TEAM" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface VmTemplate {
  id: string;
  name: string;
  os: string;
  os_type: string;
  cpu: number;
  ram_gb: number;
  disk_gb: number;
  proxmox_template_id: string;
  iso_path?: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export type RequestStatus = 
  | "PENDING_TL" 
  | "PENDING_IT" 
  | "PROVISIONING" 
  | "ACTIVE" 
  | "REJECTED" 
  | "FAILED";

export interface VmRequest {
  id: string;
  requester_id: string;
  title: string;
  justification: string;
  template_id: string;
  request_type?: "VM" | "VDI";
  vm_name?: string;
  status: RequestStatus;
  
  tl_approver_id?: string;
  tl_approved_at?: string;
  tl_note?: string;
  
  it_approver_id?: string;
  it_approved_at?: string;
  it_note?: string;
  
  proxmox_vm_id?: string;
  proxmox_node?: string;
  ip_address?: string;
  mac_address?: string;
  vm_username?: string;
  vm_password?: string;
  glpi_ticket_id?: string;
  error_message?: string;
  
  created_at: string;
  updated_at: string;
  
  requester?: User;
  template?: VmTemplate;
  audit_logs?: AuditLog[];
}

export interface AuditLog {
  id: string;
  action: string;
  details?: string;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface NewRequestData {
  title: string;
  justification: string;
  template_id: string;
  request_type?: "VM" | "VDI";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DashboardStats {
  total_requests: number;
  pending_approvals: number;
  active_vms: number;
  failed_requests: number;
}
