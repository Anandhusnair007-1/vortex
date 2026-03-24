# Vortex Platform - Enterprise IT Operations Dashboard

A production-grade IT operations platform built with FastAPI, React, PostgreSQL, and Redis.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control (Admin, Team Lead, Engineer, Viewer)
- 🎯 **Activity Tracking**: Automated logging of all user actions with a points/gamification system
- 📱 **RFID Access Control**: Centralized management of RFID door controllers across multiple locations
- ⚠️ **Real-time Alerts**: WebSocket-powered alert system with Observium and AWX integration
- 🖥️ **VM Inventory**: Search and manage VMs across 18 Proxmox nodes with instant local search
- 👥 **Team Dashboard**: Live task feed, leaderboard, and detailed reporting for team leads
- 📊 **Reports & Analytics**: Points tracking, activity history, and team performance metrics

## Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React 18 + Tailwind CSS
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Authentication**: JWT tokens + bcrypt hashing
- **Containerization**: Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Git

### 1. Clone and Setup

```bash
cd /home/anandhusnair/projects/Vortex
cp .env.example .env
```

### 2. Update .env (if needed for your environment)

```bash
nano .env
```

Key variables to set:
- `JWT_SECRET_KEY` - Change this to a secure random string!
- Database credentials
- Proxmox node IPs if using VM sync
- Observium API token for alerts

### 3. Start the Stack

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- FastAPI backend (port 8000)
- React frontend (port 3000)

### 4. Initialize the Database

```bash
docker-compose exec backend python -c "from database import init_db; init_db()"
```

### 5. Create the First Admin User

```bash
docker-compose exec backend python << 'EOF'
from database import SessionLocal
from models import User
from auth.jwt import get_password_hash

db = SessionLocal()
admin = User(
    username="admin",
    email="admin@vortex.local",
    password_hash=get_password_hash("admin"),
    role="admin"
)
db.add(admin)
db.commit()
print("✓ Admin user created")
db.close()
EOF
```

### 6. Access the Platform

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **WebSocket Alerts**: ws://localhost:8000/ws/alerts

Login with:
- Username: `admin`
- Password: `admin`

## Project Structure

```
Vortex/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── database.py             # SQLAlchemy setup
│   ├── models.py               # Database models
│   ├── requirements.txt         # Python dependencies
│   ├── auth/
│   │   ├── jwt.py             # JWT token logic
│   │   └── dependencies.py     # Auth dependencies
│   ├── routers/
│   │   ├── auth.py            # Login/refresh endpoints
│   │   ├── users.py           # User management
│   │   ├── rfid.py            # RFID control
│   │   ├── alerts.py          # Alert system + WebSocket
│   │   ├── vms.py             # VM inventory
│   │   └── tasks.py           # Task management
│   ├── middleware/
│   │   └── activity_logger.py # Log all user actions
│   ├── services/
│   │   ├── proxmox_sync.py    # VM sync service (coming soon)
│   │   └── rfid_adapter.py    # RFID device adapters (coming soon)
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── pages/              # Page components (coming soon)
│   │   ├── components/         # Reusable components (coming soon)
│   │   └── store/             # Zustand state management (coming soon)
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/` - List all users (team lead+)
- `POST /api/users/` - Create user (admin only)
- `GET /api/users/{user_id}` - Get user details
- `PUT /api/users/{user_id}` - Update user (admin only)
- `DELETE /api/users/{user_id}` - Delete user (admin only)

### RFID
- `GET /api/rfid/devices` - List all RFID devices
- `POST /api/rfid/devices` - Add device (admin only)
- `POST /api/rfid/grant` - Grant user door access
- `POST /api/rfid/revoke` - Revoke user door access
- `GET /api/rfid/users/{user_id}/access` - Get user's access
- `GET /api/rfid/audit` - Audit log

### Alerts
- `POST /api/alerts` - Create alert (from Observium/AWX)
- `GET /api/alerts` - List active alerts
- `GET /api/alerts/history` - Alert history
- `POST /api/alerts/{alert_id}/resolve` - Resolve alert
- `WS /api/alerts/ws/alerts` - WebSocket for real-time alerts

### VMs
- `POST /api/vms/register` - Register new VM
- `GET /api/vms/search?q=<query>` - Search VMs
- `GET /api/vms/` - List all VMs with filters
- `GET /api/vms/{vm_id}` - Get VM details
- `GET /api/vms/nodes/capacity` - Node capacity info

### Tasks
- `POST /api/tasks/` - Create task
- `GET /api/tasks/` - List tasks
- `GET /api/tasks/my-tasks` - Current user's tasks
- `PUT /api/tasks/{task_id}` - Update task
- `DELETE /api/tasks/{task_id}` - Delete task

## Role-Based Access Control

| Action | Admin | Team Lead | Engineer | Viewer |
|--------|-------|-----------|----------|--------|
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Reports | ✓ | ✓ | ✗ | ✗ |
| Create VMs | ✓ | ✓ | ✓ | ✗ |
| Grant RFID | ✓ | ✓ | ✓ | ✗ |
| Resolve Alerts | ✓ | ✓ | ✓ | ✗ |
| View Dashboard | ✓ | ✓ | ✓ | ✓ |

## Configuring Alerts from Observium

To send alerts from Observium to Vortex:

1. Go to Observium Settings → Alerts → Alert transports
2. Create new transport with:
   - **Type**: Webhook
   - **URL**: `http://vortex:8000/api/alerts`
   - **Method**: POST

3. Configure alert rules to use this transport

The webhook will receive:
```json
{
  "source": "observium",
  "device_name": "server-01",
  "issue": "device_down",
  "severity": "critical",
  "description": "Device is down"
}
```

## Configuring VM Auto-Sync

Edit `.env`:
```
PROXMOX_NODES=node1:192.168.1.10,node2:192.168.1.11,node3:192.168.1.12
PROXMOX_USERNAME=root@pam
PROXMOX_PASSWORD=your_password
```

The sync service will automatically run every 5 minutes.

## Developer Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute backend commands
docker-compose exec backend python -c "..."

# Stop everything
docker-compose down

# Remove volumes (full reset)
docker-compose down -v

# Rebuild containers
docker-compose build

# Run with debug mode
DEBUG=true docker-compose up
```

## Points System

Users earn points for actions:

| Action | Points |
|--------|--------|
| Create VM/VDI | 10 |
| Grant RFID Access | 5 |
| Resolve Critical Alert | 8 |
| Revoke RFID Access | 3 |
| Run Ansible Playbook | 6 |

Points are tracked in the `activity_log` table and aggregated on the user profile.

## Next Steps

1. **Configure RFID Adapters**: Add support for your RFID device brands
2. **Setup Proxmox Integration**: Configure Proxmox API credentials
3. **Customize Branding**: Update color scheme and logos
4. **Deploy to Production**: Use production deployment guide

## Troubleshooting

### Database connection failed
```bash
docker-compose logs db
# Check connection string in .env
```

### API returns 401 Unauthorized
```bash
# Check JWT_SECRET_KEY in .env is set correctly
# Tokens expire in 8 hours by default
```

### WebSocket connection fails
```bash
# Check REACT_APP_WS_URL in .env
# Should be ws:// not http://
```

## Production Deployment

See `PRODUCTION_DEPLOYMENT.md` for complete deployment guide including:
- Nginx reverse proxy setup
- SSL certificate configuration
- Database backups
- High availability setup
- Monitoring and logging

## Support & Documentation

- API Documentation: http://localhost:8000/docs
- Swagger UI: http://localhost:8000/redoc
- Backend logs: `docker-compose logs backend`
- Frontend logs: Open browser console (F12)

## License

Proprietary - Internal Use Only
