# Vortex Platform - Operations Runbook

Quick reference guide for common operational tasks.

## Table of Contents
1. [Starting & Stopping](#starting--stopping)
2. [User Management](#user-management)
3. [Adding New Infrastructure](#adding-new-infrastructure)
4. [Troubleshooting](#troubleshooting)
5. [Backup & Restore](#backup--restore)

---

## Starting & Stopping

### Start the Platform

```bash
cd /opt/vortex
docker-compose up -d

# Verify all services
docker-compose ps

# Expected output:
# NAME              COMMAND             STATUS    PORTS
# vortex_db          postgres            Up        5432/tcp
# vortex_redis       redis               Up        6379/tcp
# vortex_backend     uvicorn             Up        0.0.0.0:8000->8000/tcp
# vortex_frontend    serve               Up        0.0.0.0:3000->3000/tcp
```

### Stop the Platform

```bash
cd /opt/vortex
docker-compose down

# Stop including volumes (full cleanup)
docker-compose down -v
```

### Restart a Service

```bash
# Restart backend
docker-compose restart backend

# Restart frontend
docker-compose restart frontend

# Restart all
docker-compose restart
```

### View Logs

```bash
# Real-time backend logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs backend | tail -100

# Frontend logs
docker-compose logs -f frontend

# All services
docker-compose logs -f

# Save to file
docker-compose logs > /tmp/vortex_logs.txt
```

---

## User Management

### Create New User

#### Via API (Recommended)

```bash
curl -X POST https://vortex.internal/api/users/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "email": "john.doe@company.com",
    "password": "temporary_password",
    "role": "engineer"
  }'
```

#### Via Python Script

```bash
cd /opt/vortex

docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User
from auth.jwt import get_password_hash

db = SessionLocal()
user = User(
    username="jane.smith",
    email="jane.smith@company.com",
    password_hash=get_password_hash("temporary_password"),
    role="engineer"
)
db.add(user)
db.commit()
print(f"✓ User created: {user.username}")
db.close()
EOF
```

### Reset Admin Password

```bash
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User
from auth.jwt import get_password_hash

db = SessionLocal()
admin = db.query(User).filter(User.username == "admin").first()
admin.password_hash = get_password_hash("new_secure_password")
db.commit()
print("✓ Admin password reset")
db.close()
EOF
```

### List All Users

```bash
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User

db = SessionLocal()
users = db.query(User).all()
for user in users:
    print(f"{user.username:20} {user.role:15} {user.email}")
db.close()
EOF
```

### Change User Role

```bash
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).filter(User.username == "john.doe").first()
if user:
    user.role = "team-lead"  # admin, team-lead, engineer, viewer
    db.commit()
    print(f"✓ {user.username} role changed to {user.role}")
else:
    print("User not found")
db.close()
EOF
```

### Deactivate User

```bash
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).filter(User.username == "john.doe").first()
if user:
    user.is_active = False
    db.commit()
    print(f"✓ {user.username} deactivated")
else:
    print("User not found")
db.close()
EOF
```

---

## Adding New Infrastructure

### Add a New Proxmox Node

1. **Get Proxmox Credentials**
   ```bash
   # On Proxmox server
   pveum user view  # List users
   pveum role list  # List available roles
   ```

2. **Update .env**
   ```bash
   nano /opt/vortex/.env
   
   # Add to PROXMOX_NODES (comma-separated)
   PROXMOX_NODES=node1:192.168.1.10,node2:192.168.1.11,new_node:192.168.1.12
   ```

3. **Restart Backend**
   ```bash
   docker-compose restart backend
   
   # VM sync will run automatically in 5 minutes
   # Or trigger manually:
   docker-compose exec backend python << 'EOF'
   from services.proxmox_sync import sync_all_vms
   sync_all_vms()
   EOF
   ```

4. **Verify in UI**
   - Go to VM Inventory page
   - Search for VMs from the new node
   - Should appear in Node Capacity panel

### Add New RFID Device Brand Adapter

1. **Create New Adapter Class**
   ```bash
   # Edit backend/services/rfid_adapter.py
   nano /opt/vortex/backend/services/rfid_adapter.py
   ```

   Example (add to the file):
   ```python
   class MyDeviceAdapter(RFIDAdapter):
       def connect(self) -> bool:
           # Implement connection logic
           pass
       
       def grant_access(self, user_id: str, card_number: str) -> bool:
           # Implement access grant
           pass
       
       def revoke_access(self, user_id: str, card_number: str) -> bool:
           # Implement access revoke
           pass
       
       def get_status(self) -> dict:
           # Implement status check
           pass
   ```

2. **Add to Adapter Factory**
   ```python
   # In get_rfid_adapter function, add:
   adapters = {
       "zkteco": ZKTecoAdapter,
       "generic_http": GenericHTTPAdapter,
       "mydevice": MyDeviceAdapter,  # NEW
   }
   ```

3. **Restart Backend**
   ```bash
   docker-compose restart backend
   ```

4. **Create Device in UI**
   - Go to RFID Access page
   - Click "Add Device"
   - Select brand: "mydevice"
   - Fill in IP and credentials
   - Save

### Add New Observium Alert Source

1. **Configure Observium**
   - Go to Observium Settings → Alerts → Alert Transports
   - Create new Transport:
     - **Type**: Webhook
     - **URL**: `https://vortex.internal/api/alerts`
     - **Method**: POST

2. **Configure Alert Rule**
   - Go to Alert Rules
   - Create rule for your device
   - Set Transport to the webhook created above
   - Test alert

3. **Verify in Vortex**
   - Go to Alerts page
   - Should see incoming alerts with source "observium"

---

## Troubleshooting

### Container Won't Start

```bash
# Check error logs
docker-compose logs backend

# Common fixes:
# 1. Database connection issue
docker-compose exec db pg_isready -U vortex_user

# 2. Port already in use
lsof -i :8000
lsof -i :5432

# 3. Rebuild and restart
docker-compose build backend
docker-compose up -d
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose ps db

# Test connection
docker-compose exec db psql -U vortex_user -c "SELECT version();"

# Check connection string in backend logs
docker-compose logs backend | grep DATABASE_URL
```

### WebSocket Not Connecting

```bash
# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://vortex.internal/ws/alerts

# Check Nginx configuration
sudo nginx -t

# Verify proxy settings for /ws route
sudo grep -A 10 "location /ws" /etc/nginx/sites-enabled/vortex
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Check database size
docker-compose exec db psql -U vortex_user -c \
  "SELECT pg_size_pretty(pg_database_size('vortex'));"

# Vacuum database
docker-compose exec db psql -U vortex_user -d vortex -c "VACUUM ANALYZE;"
```

### Slow Performance

```bash
# Check backend response times
docker-compose logs backend | grep "X-Process-Time"

# Check database queries
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import ActivityLog

db = SessionLocal()
count = db.query(ActivityLog).count()
print(f"Activity log entries: {count}")
db.close()
EOF

# If too many logs, clean old entries:
# DELETE FROM activity_log WHERE timestamp < NOW() - INTERVAL '90 days';
```

---

## Backup & Restore

### Create Full Backup

```bash
cd /opt/vortex

# Manual backup
docker-compose exec db pg_dump -U vortex_user vortex | gzip > vortex_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Or use the backup script
/opt/vortex/backup.sh
```

### Restore from Backup

```bash
cd /opt/vortex

# Stop services
docker-compose down

# Restore database
gunzip < vortex_backup_20240324_120000.sql.gz | \
  docker-compose exec -T db psql -U vortex_user -d vortex

# Start services
docker-compose up -d
```

### Backup.sh Automated

```bash
# Check cron job
sudo crontab -l

# View backup schedule
tail -f /var/log/vortex_backup.log

# List backups
ls -lh /opt/vortex/backups/

# View retention policy (edit backup.sh)
nano /opt/vortex/backup.sh
# Default: Keep 7 days of backups
```

### Database Maintenance

```bash
# Full optimization
docker-compose exec db psql -U vortex_user -d vortex << 'EOF'
VACUUM FULL;
ANALYZE;
REINDEX DATABASE vortex;
EOF

# Clean old activity logs (keep 90 days)
docker-compose exec db psql -U vortex_user -d vortex << 'EOF'
DELETE FROM activity_log WHERE timestamp < NOW() - INTERVAL '90 days';
VACUUM ANALYZE activity_log;
EOF
```

---

## Common Commands Reference

```bash
# SSH to container
docker-compose exec backend /bin/bash

# Execute Python code
docker-compose exec backend python -c "print('Hello')"

# View environment variables
docker-compose exec backend env

# Check disk usage
du -sh /opt/vortex/*

# Check system resources
free -h
df -h

# Restart everything
cd /opt/vortex && docker-compose restart

# View system logs
sudo journalctl -u vortex.service -f

# Test API endpoint
curl -k https://vortex.internal/api/health

# Monitor Docker stats
docker stats --no-stream
```

---

## Support

For issues not covered here:

1. Check logs: `docker-compose logs`
2. Verify configuration: Review `.env` and `docker-compose.yml`
3. Test API: `curl https://vortex.internal/api/health`
4. Check database: `docker-compose exec db psql...`
5. Review DEPLOYMENT.md for additional setup details

**Emergency Contacts**:
- DevOps Team: devops@company.com
- Security: security@company.com
- Support: support@company.com
