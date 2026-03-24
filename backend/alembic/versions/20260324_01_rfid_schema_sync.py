"""sync_rfid_schema_for_device_ip_and_encrypted_credentials

Revision ID: 20260324_01
Revises: 
Create Date: 2026-03-24 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260324_01"
down_revision = None
branch_labels = None
depends_on = None


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(inspector, table_name: str, index_name: str) -> bool:
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "rfid_devices" in inspector.get_table_names():
        with op.batch_alter_table("rfid_devices") as batch_op:
            if _has_column(inspector, "rfid_devices", "ip") and not _has_column(inspector, "rfid_devices", "ip_address"):
                batch_op.alter_column("ip", new_column_name="ip_address")

            if not _has_column(inspector, "rfid_devices", "credentials_encrypted"):
                batch_op.add_column(sa.Column("credentials_encrypted", sa.Text(), nullable=True))

        # Refresh inspector after structural changes.
        inspector = sa.inspect(bind)
        if not _has_index(inspector, "rfid_devices", "ix_rfid_devices_ip_address"):
            op.create_index("ix_rfid_devices_ip_address", "rfid_devices", ["ip_address"], unique=True)

    if "rfid_access" in inspector.get_table_names():
        if not _has_index(inspector, "rfid_access", "ix_rfid_access_user_device_active"):
            op.create_index(
                "ix_rfid_access_user_device_active",
                "rfid_access",
                ["user_id", "device_id", "is_active"],
                unique=False,
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "rfid_access" in inspector.get_table_names() and _has_index(inspector, "rfid_access", "ix_rfid_access_user_device_active"):
        op.drop_index("ix_rfid_access_user_device_active", table_name="rfid_access")

    if "rfid_devices" in inspector.get_table_names():
        if _has_index(inspector, "rfid_devices", "ix_rfid_devices_ip_address"):
            op.drop_index("ix_rfid_devices_ip_address", table_name="rfid_devices")

        with op.batch_alter_table("rfid_devices") as batch_op:
            if _has_column(inspector, "rfid_devices", "credentials_encrypted"):
                batch_op.drop_column("credentials_encrypted")

            if _has_column(inspector, "rfid_devices", "ip_address") and not _has_column(inspector, "rfid_devices", "ip"):
                batch_op.alter_column("ip_address", new_column_name="ip")
