from enum import Enum

class UserRole(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    TEAM_LEAD = "TEAM_LEAD"
    IT_TEAM = "IT_TEAM"
    ADMIN = "ADMIN"

class VmRequestStatus(str, Enum):
    PENDING_TL = "PENDING_TL"
    PENDING_IT = "PENDING_IT"
    PROVISIONING = "PROVISIONING"
    ACTIVE = "ACTIVE"
    FAILED = "FAILED"
    REJECTED = "REJECTED"
