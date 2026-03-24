# Vortex Platform - Quick Start Guide

Get up and running in 15 minutes.

## Prerequisites

- Ubuntu 22.04 LTS server (or equivalent Linux)
- Docker and Docker Compose installed
- Git installed
- Domain name pointing to server (or use IP address)

## 5-Minute Deployment

### 1. Clone and Navigate

```bash
git clone https://github.com/your-company/vortex.git /opt/vortex
cd /opt/vortex
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env

# CRITICAL: Update these variables
DATABASE_URL=postgresql://vortex_user:STRONG_PASSWORD@db:5432/vortex
SECRET_KEY=your-super-secret-key-32-characters-min
PROXMOX_NODES=pve1:192.168.1.10,pve2:192.168.1.11
PROXMOX_USERNAME=admin@pam
PROXMOX_PASSWORD=your-proxmox-password
```

### 3. Start Services

```bash
docker-compose up -d

# Wait for services to start (30 seconds)
sleep 30

# Verify all services are running
docker-compose ps

# All containers should show "Up" status
```

### 4. Initialize Database & Create Admin

```bash
docker-compose exec backend python setup_admin.py

# Follow prompts to create admin user
# Or use: docker-compose exec backend python setup_admin.py --password MyPassword123 --demo
```

### 5. Access Platform

Open your browser:
```
http://localhost:3000          # Development
https://vortex.internal      # Production (after SSL setup)
```

**Default Credentials:**
- Username: `admin`
- Password: (as set in step 4)

---

## 15-Minute Advanced Setup

### Setup SSL Certificate

```bash
# Option A: Self-signed (testing)
cd /opt/vortex
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key \
  -out ssl/certificate.crt -days 365 -nodes \
  -subj "/CN=vortex.internal"

# Option B: Let's Encrypt (production)
sudo certbot certonly --standalone -d vortex.internal
# Copy certs to /opt/vortex/ssl/

# Update docker-compose.yml volumes for nginx service
# - ./ssl:/etc/nginx/ssl:ro
```

### Setup Nginx Reverse Proxy

```bash
# Create Nginx config
sudo tee /etc/nginx/sites-enabled/vortex > /dev/null << 'EOF'
server {
    listen 80;
    server_name vortex.internal;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name vortex.internal;
    
    ssl_certificate /opt/vortex/ssl/certificate.crt;
    ssl_certificate_key /opt/vortex/ssl/private.key;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Add Additional Users

```bash
# Via CLI
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User
from auth.jwt import get_password_hash

db = SessionLocal()
user = User(
    username="john.doe",
    email="john.doe@company.com",
    password_hash=get_password_hash("secure_password"),
    role="engineer"  # admin, team-lead, engineer, viewer
)
db.add(user)
db.commit()
print(f"✓ User created: {user.username}")
db.close()
EOF

# Or via Frontend UI (Admin login → Users → Add User)
```

### Connect Proxmox Nodes

1. Go to **/api/docs** (FastAPI Swagger UI)
2. Authenticate with admin token
3. Test `/vms/` endpoint to verify Proxmox integration
4. Go to frontend **VM Inventory** page
5. Search for VMs - should show results from all configured nodes

### Setup Alert Webhook (Observium)

1. Go to Observium → Settings → Alerts → Alert Transports
2. Create new **Webhook** transport:
   - **URL**: `https://vortex.internal/api/alerts`
   - **Method**: POST
3. Create Alert Rule and assign the webhook
4. Test alert - should appear in Vortex **Alerts** page within seconds

### Configure RFID Access Control

1. Get RFID device details:
   - IP address / hostname
   - Port (default: 8080 for ZKTeco)
   - Credentials

2. Go to frontend **RFID Access** → Add Device:
   - Select device brand (ZKTeco or Generic HTTP)
   - Enter connection details
   - Test connection

3. Grant access to users:
   - Select user in sidebar
   - Check devices to grant
   - Click "Save Access"

---

## Essential Commands

```bash
# Service Management
cd /opt/vortex
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose restart        # Restart all services
docker-compose ps             # Check status

# Logs
docker-compose logs -f backend    # View live backend logs
docker-compose logs -f frontend   # View live frontend logs
docker-compose logs | tail -100   # Last 100 lines all services

# Database Operations
docker-compose exec db psql -U vortex_user -d vortex -c "SELECT version();"
docker-compose exec db pg_dump -U vortex_user vortex > backup.sql

# Backup & Restore
cd /opt/vortex && bash backup.sh               # Create backup
gunzip < backup.sql.gz | docker-compose exec -T db psql -U vortex_user -d vortex
```

---

## Troubleshooting

### "Connection refused" on login

```bash
# Check if backend is running
docker-compose ps backend

# Check backend logs for errors
docker-compose logs backend | head -50

# Restart backend
docker-compose restart backend
```

### "VMs not showing up"

```bash
# Verify Proxmox credentials in .env
docker-compose exec backend python << 'EOF'
from services.proxmox_sync import sync_all_vms
sync_all_vms()
print("✓ Manual sync completed")
EOF
```

### "WebSocket not connecting"

```bash
# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8000/ws/alerts

# Check for firewall blocking
sudo ufw status

# Restart backend
docker-compose restart backend
```

### "Database error"

```bash
# Check database container
docker-compose ps db

# Initialize database
docker-compose exec backend python setup_admin.py

# Verify connection
docker-compose exec db psql -U vortex_user -c "SELECT 1"
```

---

## Next Steps

After successful deployment:

1. **Read Full Documentation**
   - [README.md](README.md) - Platform features and architecture
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment details
   - [RUNBOOK.md](RUNBOOK.md) - Operational procedures

2. **Customize Configuration**
   - Add your Proxmox nodes
   - Connect your RFID devices
   - Setup Observium webhooks
   - Configure backup schedule

3. **Team Training**
   - Show team the dashboard
   - Explain VM search functionality
   - Demo alert notifications
   - Train on RFID access control

4. **Production Hardening** (see DEPLOYMENT.md)
   - Setup SSL certificates
   - Configure centralized logging
   - Setup monitoring and alerting
   - Implement backup automation
   - Create disaster recovery plan

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser                          │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│              Nginx Reverse Proxy                         │
│          (SSL Termination, Load Balance)                │
└─────┬─────────────────────────────────────┬─────────────┘
      │ HTTP                                │ WebSocket
      ▼                                     ▼
┌──────────────────┐            ┌──────────────────┐
│ React Frontend   │            │ FastAPI Backend  │
│ (Port 3000)      │◄──────────►│ (Port 8000)      │
└──────────────────┘  REST API  └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
              │ PostgreSQL   │    │    Redis     │    │   Proxmox    │
              │ Database     │    │    Cache     │    │    Nodes     │
              └──────────────┘    └──────────────┘    └──────────────┘
                    │                    │
                    └────────┬───────────┘
                             │
                    ┌────────▼──────────┐
                    │  Background Jobs  │
                    │  - VM Sync (5min) │
                    │  - Cleanup Tasks  │
                    └───────────────────┘
```

---

## Support

- **Documentation**: See README.md, DEPLOYMENT.md, RUNBOOK.md
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Status Check**: `curl http://localhost:8000/api/health`
- **Logs**: `docker-compose logs -f`

**Having issues?** Check RUNBOOK.md troubleshooting section or review logs for error details.

