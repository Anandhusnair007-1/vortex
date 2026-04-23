from schemas import AlertCreateRequest


class ObserviumMapper:
    def to_alert_request(self, payload: dict) -> AlertCreateRequest:
        severity_raw = str(payload.get("severity", "info")).lower()
        if severity_raw not in {"info", "warning", "critical"}:
            severity_raw = "info"

        return AlertCreateRequest(
            source="observium",
            device_name=str(payload.get("hostname") or payload.get("device") or "unknown-device"),
            issue_type=str(payload.get("alert_name") or payload.get("issue") or "infrastructure_alert"),
            severity=severity_raw,
            message=str(payload.get("message") or payload.get("details") or "Observium alert received"),
        )


observium_mapper = ObserviumMapper()
