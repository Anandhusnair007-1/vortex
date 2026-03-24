# ITops Platform - Architecture Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            User Tier                                     │
│  ┌──────────────────┬──────────────────┬──────────────────┐             │
│  │     Admin        │     Team-Lead    │    Engineer      │   Viewer    │
│  │   Full Access    │   Manage Users   │   Manage Tasks   │  Read-Only  │
│  └──────────────────┴──────────────────┴──────────────────┘             │
└────────────┬─────────────────────────────────────────────────────────────┘
             │ HTTPS / WebSocket
┌────────────▼─────────────────────────────────────────────────────────────┐
│                       Presentation Tier                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Web Browser                                                        │ │
│  │  ├─ React SPA (8 Pages)                                           │ │
│  │  ├─ Real-time Components (Alert Bell, Status)                     │ │
│  │  └─ Zustand State Management                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────┬────────────────┘
             │ HTTP                                       │ WebSocket
┌────────────▼──────────────────────────────────────────▼────────────────┐
│                   Reverse Proxy Tier (Nginx)                           │
│  ├─ SSL/TLS Termination                                               │
│  ├─ Request Routing (/api → Backend, / → Frontend)                   │
│  ├─ WebSocket Upgrade (/ws → Backend)                                │
│  └─ Load Balancing (Ready)                                            │
└────────────┬──────────────────────────────────────────┬────────────────┘
             │                                          │
┌────────────▼─────────────────────┐  ┌───────────────▼──────────────────┐
│     API Tier (FastAPI Backend)   │  │  WebSocket Connection Manager    │
│  ─────────────────────────────── │  │  ──────────────────────────────- │
│  Core Routers:                   │  │  Real-time Alert Streaming       │
│  • auth (JWT, OAuth ready)        │  │  • Browser beep notifications    │
│  • users (RBAC enforcement)       │  │  • Alert resolution push         │
│  • rfid (Multi-brand adapters)    │  │  • Status updates                │
│  • alerts (Webhook + WebSocket)   │  │                                  │
│  • vms (Proxmox sync interface)   │  │  Connection Pool:                │
│  • tasks (Workflow engine)        │  │  └─ Max 1000 connections        │
│                                   │  │                                  │
│  Authentication Flow:             │  └──────────────────────────────────┘
│  1. Login → JWT tokens            │
│  2. Access token in header        │
│  3. 401 → Refresh flow            │
│  4. New tokens returned           │
└────────────┬──────────────────────┘
             │
             ├─────────────────┬──────────────────┬─────────────────┐
             │                 │                  │                 │
┌────────────▼──────┐  ┌──────▼──────────┐  ┌────▼────────────┐  ┌▼─────────┐
│  PostgreSQL DB    │  │  Redis Cache    │  │ Background Jobs │  │ External │
│  (Persistent Data)│  │  (Session Store)│  │                 │  │ Services │
│  ──────────────── │  │ ────────────── │  │ ────────────── │  │ ────────│
│  9 Tables:        │  │ Auth tokens     │  │ • Proxmox Sync  │  │ Proxmox  │
│  • users          │  │ Cache hits      │  │   (5-min job)   │  │ Cluster  │
│  • activity_log   │  │ Session state   │  │ • Cleanup tasks │  │          │
│  • rfid_devices   │  │                 │  │ • Scheduler     │  │ RFID     │
│  • rfid_access    │  │ Connection:     │  │                 │  │ Devices  │
│  • alerts         │  │ redis://redis:6 │  │ Thread-safe:    │  │          │
│  • vm_inventory   │  │ 379             │  │ APScheduler     │  │ Observium│
│  • tasks          │  │                 │  │                 │  │ Webhooks │
│  • points_config  │  │ TTL: 7 days     │  │ VM Sync Pool:   │  │          │
│  • session_tokens │  │                 │  │ 5 connections   │  │ External │
│                   │  │                 │  │                 │  │ APIs     │
│  Indexed:         │  │                 │  │                 │  │          │
│  ├─ user_id       │  │                 │  │                 │  │          │
│  ├─ timestamp     │  │                 │  │                 │  │          │
│  ├─ status        │  │                 │  │                 │  │          │
│  └─ token_id      │  │                 │  │                 │  │          │
└───────────────────┘  └──────────────────┘  └─────────────────┘  └──────────┘
```

---

## Data Flow Architecture

### Authentication Flow
```
User Browser                Backend
    │                         │
    ├─ POST /login ──────────►│
    │ (username, password)    │
    │                         ├─ Verify password (bcrypt)
    │                         ├─ Generate JWT tokens
    │◄────── Response ────────┤ (access + refresh)
    │ (tokens + user)         │
    │                         │
    ├─ Store in localStorage  │
    │                         │
    ├─ API request ──────────►├─ Verify access token
    │ (with Bearer header)    │
    │◄────── Data ────────────┤
```

### Real-time Alert Flow
```
Observium                 Backend                  Browser
    │                        │                        │
    ├─ POST /api/alerts ────►├─ Validate webhook    │
    │ (alert JSON)           ├─ Save to DB          │
    │                        ├─ Broadcast to WS ───►├─ Display toast
    │                        │                      ├─ Play beep
    │                        │                      └─ Update badge
    │                        │
    │                        │ All connected clients
    │                        │ receive update instantly
```

### VM Sync Flow
```
Background Job (Every 5 minutes)
    │
    └─ For each Proxmox node:
       ├─ Connect to node API
       ├─ Fetch all KVM VMs
       ├─ Fetch all LXC containers
       ├─ Parse resource specs (CPU, RAM, disk)
       ├─ Extract IP from agent data
       ├─ Check for existing in DB
       ├─ Create new or update existing
       └─ Update node capacity cache

Result: VM Inventory always current
        Search returns instant results
        Dashboard shows real-time stats
```

---

## Module Architecture

### Auth Module
```
┌─ JWT Management
│  ├─ create_access_token() → 8-hour token
│  ├─ create_refresh_token() → 7-day token
│  ├─ decode_token() → Validate and extract claims
│  └─ verify_password() / get_password_hash() → Bcrypt ops
│
└─ RBAC Dependencies
   ├─ get_current_user() → Extract from JWT
   ├─ require_role([...]) → Enforce permission
   ├─ require_admin() → Admin-only convenience
   ├─ require_team_lead() → Team lead+ access
   └─ require_engineer() → Engineer+ access
```

### RFID Module
```
┌─ Device Management
│  ├─ GET /devices → List all
│  ├─ POST /devices → Add new (admin only)
│  └─ Device heartbeat tracking
│
├─ Access Control
│  ├─ POST /grant → Attach user to device(s)
│  ├─ POST /revoke → Remove user from device(s)
│  ├─ GET /audit → Access trail
│  └─ is_active flag for soft delete
│
└─ Adapter Pattern
   ├─ RFIDAdapter (ABC)
   │  └─ connect()
   │  └─ grant_access()
   │  └─ revoke_access()
   │  └─ get_status()
   │
   ├─ ZKTecoAdapter → ZKTeco devices
   ├─ GenericHTTPAdapter → Any HTTP API
   │
   └─ RFIDSessionPool
      └─ Connection pooling (max 5 per device)
      └─ Automatic reconnection
      └─ Credential caching
```

### Alert Module
```
┌─ Webhook Ingestion
│  ├─ POST /api/alerts (public endpoint)
│  ├─ Parse Observium/AWX JSON
│  ├─ Auto-assign severity
│  └─ Store metadata
│
├─ WebSocket Broadcasting
│  ├─ ConnectionManager maintains active clients
│  ├─ Broadcast new alerts to all
│  ├─ Notify on alert resolution
│  └─ Handle client disconnect/reconnect
│
├─ API Endpoints
│  ├─ GET /alerts → Unresolved (with filter)
│  ├─ GET /alerts/history → Last 7 days
│  ├─ POST /{id}/resolve → Manual resolution
│  └─ WS /ws/alerts → Real-time stream
│
└─ Alert Lifecycle
   New (unresolved) → Displayed
   Resolved (manual) → Archive
   History (7-day) → Delete
```

### VM Module
```
┌─ Proxmox Integration
│  ├─ sync_vms_from_node() → Fetch from single node
│  ├─ get_proxmox_connection() → Pool management
│  └─ parse_proxmox_nodes() → Parse config
│
├─ Search Engine (Local DB)
│  ├─ GET /search?q=query → Instant results
│  ├─ Searches: name, IP, owner, node
│  ├─ Returns within 100ms
│  └─ No external API calls
│
├─ Inventory Management
│  ├─ POST /register → Add new VM
│  ├─ GET / → Paginated list
│  ├─ GET /nodes/capacity → Aggregated stats
│  └─ Status tracking (running/stopped/suspended)
│
└─ Background Sync
   ├─ APScheduler every 5 minutes
   ├─ Non-blocking (separate thread)
   ├─ Auto-recovery on failure
   └─ Logs all changes
```

### Task Module
```
┌─ Workflow Engine
│  ├─ Status: pending → in_progress → completed/failed
│  ├─ Timestamps: created_at, started_at, completed_at
│  ├─ Priority levels: low, medium, high, critical
│  └─ Status transitions:
│      pending ──┬─► in_progress ──┬─► completed
│               │                 └─► failed
│               └─► cancelled
│
├─ Access Control
│  ├─ Users see own tasks
│  ├─ Team leads see all tasks
│  ├─ Admins full access
│  └─ Observers read-only
│
├─ CRUD Operations
│  ├─ POST / → Create (auto-assign to user)
│  ├─ GET / → All tasks
│  ├─ GET /my-tasks → Current user
│  ├─ PUT /{id} → Update status + timestamps
│  └─ DELETE /{id} → Soft delete (pending only)
│
└─ Activity Logging
   └─ Every status change logged with points
```

---

## Security Architecture

### Authentication Layers
```
Layer 1: Password (At Login)
├─ Bcrypt-hashed in database
├─ Never transmitted in plaintext
└─ 12 salt rounds

Layer 2: JWT Token (Per Request)
├─ Signed with SECRET_KEY
├─ Includes: user_id, username, role, exp
├─ Type indicator: access vs refresh
└─ Validated on every request

Layer 3: Role-Based Access (Per Endpoint)
├─ FastAPI dependency checks role
├─ Denies access with 403 Forbidden
├─ Roles: admin, team-lead, engineer, viewer
└─ Per-route enforcement

Layer 4: Data Ownership (Per Record)
├─ Users can only access own tasks
├─ Checks at database query level
└─ Soft-delete maintains referential integrity
```

### Data Protection
```
At Rest (Database)
├─ PostgreSQL with encrypted connections
├─ Backups stored locally (can add encryption)
└─ Database passwords in .env (not in code)

In Transit
├─ HTTPS via Nginx with SSL/TLS
├─ WebSocket secured (wss://)
├─ All secrets in environment variables
└─ No secrets in git

In Process
├─ Token validation on every request
├─ Session tokens stored in Redis (short TTL)
├─ Background jobs run with DB isolation
└─ Activity logging for audit trail
```

---

## Scaling Considerations

### Horizontal Scaling (Ready)
```
Multiple Backend Instances
├─ Nginx load balances
├─ Shared PostgreSQL (connection pool)
├─ Shared Redis (session store)
├─ Distributed job queue (future)
└─ WebSocket connections sticky per instance

Current Design
├─ Single instance (suitable for <1000 concurrent)
├─ PostgreSQL connection pool: 10 connections
├─ Redis session store: unlimited
└─ Background jobs: non-blocking
```

### Vertical Scaling
```
Database
├─ Add more connections (current: 10)
├─ Increase shared buffers
├─ Add more RAM for cache
└─ Query optimization

Redis
├─ Increase max memory
├─ Add persistence (RDB snapshots)
└─ Monitor memory usage

Backend
├─ Increase Uvicorn workers
├─ Add more background task threads
└─ Monitor CPU/memory via Docker stats
```

---

## Deployment Topologies

### Development (Current - docker-compose)
```
Single machine with all services:
├─ PostgreSQL (dev, single instance)
├─ Redis (dev, persistence not critical)
├─ FastAPI (single process, hot reload)
├─ React (dev server with hot reload)
└─ Nginx (optional, usually skip for localhost)
```

### Staging
```
Single VM (4 CPU, 8GB RAM):
├─ PostgreSQL 15 (prod config)
├─ Redis 7 (persistence enabled)
├─ FastAPI (Uvicorn, single process)
├─ React (static build, nginx)
└─ Monitoring (optional prometheus)
```

### Production (Recommended)
```
Multiple VMs (recommended 2-3 nodes):

Load Balancer / Reverse Proxy:
├─ Nginx with health checks
├─ SSL/TLS termination
└─ Request routing

Backend Pool (2-3 instances):
├─ Uvicorn (single per instance)
├─ Shared PostgreSQL connection
├─ Shared Redis
└─ Background jobs (one per cluster)

Data Tier:
├─ PostgreSQL primary + replica (future)
├─ Redis with persistence
└─ Automated backups (daily)
```

---

## Monitoring Points

### Application Metrics
```
Backend
├─ API response times (per endpoint)
├─ Active connections
├─ Token refresh rate
├─ Database query times
├─ Background job execution
└─ Error rates and types

Frontend
├─ Page load times
├─ API call latency from client
├─ WebSocket connection health
└─ React component render times
```

### Infrastructure Metrics
```
Containers
├─ CPU usage per service
├─ Memory consumption
├─ Disk I/O
├─ Network I/O
└─ Container restart count

Database
├─ Query execution time
├─ Connection pool usage
├─ Disk space utilization
├─ Cache hit rate
└─ Lock contention
```

### Business Metrics
```
Users
├─ Active users per role
├─ Login success/failure rate
├─ Points awarded per action

Operations
├─ Alerts created per hour
├─ Alert resolution time
├─ VM sync accuracy
├─ RFID access grant/revoke rate

Platform Health
├─ Uptime percentage
├─ Error rate by module
├─ Backup success rate
└─ Average response time
```

---

## Disaster Recovery

### Backup Strategy
```
Daily Backups:
├─ Database (full dump to gzip file)
├─ Retention: 7 days rotating
├─ Automated via cron job
└─ Stored locally (can add remote)

Recovery Procedures:
├─ Stop services
├─ Restore DB from backup
├─ Verify data integrity
├─ Start services
└─ Run health checks
```

### High Availability (Future)
```
Active-Active Setup:
├─ 2+ backend instances
├─ Load balanced frontend
├─ Primary → Replica DB
└─ Redis cluster

Failover:
├─ Health checks every 10s
├─ Auto-failover on replica
├─ Sticky sessions for WebSocket
└─ Background job coordination
```

---

## Performance Optimization

### Current (v1.0)
```
✓ Database query optimization with indexes
✓ Redis caching for session tokens
✓ Lazy loading of React components
✓ Connection pooling (DB + Redis)
✓ Background job non-blocking
✓ WebSocket direct connection (no polling)
✓ Local search (no external API)
```

### Future Enhancements
```
□ API response caching (Redis)
□ Frontend code splitting
□ GraphQL for reduced payload
□ Request/response compression
□ Database query result caching
□ CDN for static assets
□ Service worker for offline capability
```

---

This architecture provides a solid foundation for a production-grade cybersecurity operations platform with room for scaling, monitoring, and high-availability upgrades.

