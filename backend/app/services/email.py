from ..core.config import settings

async def send_email(to_email: str, subject: str, body: str):
    if not settings.SMTP_HOST:
        print(f"--- MOCK EMAIL ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body[:100]}...")
        print(f"------------------")
        return

    # Real SMTP logic using aiosmtplib would go here
    pass

async def send_tl_approval_request(tl_emails, request_details):
    await send_email(
        ", ".join(tl_emails),
        f"VM Request Approval Required: {request_details['title']}",
        f"A new VM request has been submitted by {request_details['requester']}."
    )

async def send_it_approval_request(it_emails, request_details):
    await send_email(
        ", ".join(it_emails),
        f"VM Provisioning Ready: {request_details['title']}",
        f"A request has been approved by the Team Lead and is ready for provisioning."
    )

async def send_rejection_email(employee_email, reason, rejected_by):
    await send_email(
        employee_email,
        "VM Request Rejected",
        f"Your VM request was rejected by {rejected_by}. Reason: {reason}"
    )

async def send_provisioning_started(employee_email, vm_name):
    await send_email(
        employee_email,
        "VM Provisioning Started",
        f"The provisioning of your VM '{vm_name}' has started. It will take 2-4 minutes."
    )

async def send_vm_ready_email(employee_email, vm_username, vm_password):
    await send_email(
        employee_email,
        "Your VM is Ready — Credentials Inside",
        f"Username: {vm_username}\nPassword: {vm_password}"
    )
