"""Add email field to users table

Revision ID: 20260324_02_add_email_to_users
Revises: 2ee65ac8664a
Create Date: 2026-03-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260324_02_add_email_to_users'
down_revision = '2ee65ac8664a'
branch_labels = None
depends_on = None


def upgrade():
    # Add email column with default value for existing users
    op.add_column('users', sa.Column('email', sa.String(255), nullable=True))
    
    # Update existing users with a placeholder email based on their username
    op.execute("UPDATE users SET email = username || '@vortex.local' WHERE email IS NULL")
    
    # Now make the column NOT NULL and add unique constraint
    op.alter_column('users', 'email', nullable=False)
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.create_index('ix_users_email', 'users', ['email'])


def downgrade():
    op.drop_index('ix_users_email', table_name='users')
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'email')
