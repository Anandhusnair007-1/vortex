# Vortex Platform - Production Deployment Guide

This guide covers deploying the Vortex platform to a production environment on Ubuntu 22.04.

## Prerequisites

- Ubuntu 22.04 LTS server
- Docker and Docker Compose installed
- Nginx installed
- SSL certificate (self-signed or legitimate)
- 4GB+ RAM, 20GB+ disk space
- Root or sudo access

## 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose (if not already installed)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 2. Clone and Setup Vortex

```bash
# Create deployment directory
sudo mkdir -p /opt/vortex
cd /opt/vortex

# Clone repository
sudo git clone https://github.com/Anandhusnair007-1/vortex.git .

# Set ownership
sudo chown -R $USER:$USER /opt/vortex

# Copy environment file
cp .env.example .env

# Edit environment variables for production
nano .env
```

### Important .env Variables for Production

```bash
# Change these immediately
JWT_SECRET_KEY=your-very-secure-random-key-at-least-32-characters
DEBUG=false
POSTGRES_PASSWORD=your-secure-db-password
POSTGRES_USER=vortex_user

# Update URLs
REACT_APP_API_URL=https://vortex.internal/api
REACT_APP_WS_URL=wss://vortex.internal/ws

# Proxmox Configuration
PROXMOX_NODES=pve1:192.168.1.10,pve2:192.168.1.11,pve3:192.168.1.12
PROXMOX_USERNAME=root@pam
PROXMOX_PASSWORD=your_proxmox_password

# Email alerts
SMTP_SERVER=smtp.gmail.com
SMTP_PASSWORD=your_app_password

# Allowed hosts
ALLOWED_HOSTS=vortex.internal,vortex.company.internal
CORS_ORIGINS=https://vortex.internal,https://vortex.company.internal
```

## 3. SSL Certificate Setup

### Self-Signed Certificate (Internal Use)

```bash
# Create certificate directory
sudo mkdir -p /opt/vortex/certs

# Generate self-signed certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/vortex/certs/vortex.key \
  -out /opt/vortex/certs/vortex.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=vortex.internal"

# Set permissions
sudo chmod 644 /opt/vortex/certs/vortex.crt
sudo chmod 644 /opt/vortex/certs/vortex.key
```

### Let's Encrypt Certificate (Public Domain)

```bash
# If using a public domain
sudo certbot certonly --standalone -d vortex.company.com

# Copy certificates
sudo cp /etc/letsencrypt/live/vortex.company.com/fullchain.pem /opt/vortex/certs/
sudo cp /etc/letsencrypt/live/vortex.company.com/privkey.pem /opt/vortex/certs/
```

## 4. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/vortex`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name vortex.internal vortex.company.internal;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vortex.internal vortex.company.internal;

    # SSL configuration
    ssl_certificate /opt/vortex/certs/vortex.crt;
    ssl_certificate_key /opt/vortex/certs/vortex.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client size limit
    client_max_body_size 100M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running tasks
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400;
    }

    # Logging
    access_log /var/log/nginx/vortex_access.log;
    error_log /var/log/nginx/vortex_error.log;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/vortex /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 5. Docker Compose for Production

Update `docker-compose.yml` for production:

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    container_name: vortex_db
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - vortex
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: vortex_redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - vortex
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: vortex_backend
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      DEBUG: "false"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - vortex
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: vortex_frontend
    environment:
      REACT_APP_API_URL: ${REACT_APP_API_URL}
      REACT_APP_WS_URL: ${REACT_APP_WS_URL}
    restart: always
    networks:
      - vortex
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

volumes:
  pg_data:
    driver: local
  redis_data:
    driver: local

networks:
  vortex:
    driver: bridge
```

## 6. Database Backup Script

Create `/opt/vortex/backup.sh`:

```bash
#!/bin/bash

# Backup configuration
BACKUP_DIR="/opt/vortex/backups"
DB_CONTAINER="vortex_db"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vortex_backup_$TIMESTAMP.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "[$(date)] Starting database backup..."
docker exec $DB_CONTAINER pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed: $BACKUP_FILE"
    
    # Remove old backups
    find $BACKUP_DIR -name "vortex_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] Old backups cleaned up"
else
    echo "[$(date)] Backup failed!"
    exit 1
fi
```

Make it executable and add to crontab:

```bash
chmod +x /opt/vortex/backup.sh

# Add to root crontab
sudo crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /opt/vortex/backup.sh >> /var/log/vortex_backup.log 2>&1
```

## 7. Systemd Service File

Create `/etc/systemd/system/vortex.service`:

```ini
[Unit]
Description=Vortex Platform
After=network-online.target
Wants=network-online.target docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/vortex
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
RemainAfterExit=yes
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vortex.service
sudo systemctl start vortex.service

# Check status
sudo systemctl status vortex.service
```

## 8. Start the Stack

```bash
cd /opt/vortex

# Build and start all services
docker-compose up -d

# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Create admin user
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
print("✓ Admin user created: admin/admin")
db.close()
EOF
```

## 9. Logging and Monitoring

### Backend Logs

```bash
# View real-time logs
docker-compose logs -f backend

# Save to file
docker-compose logs backend > /var/log/vortex_backend.log
```

### Setup Log Rotation

Create `/etc/logrotate.d/vortex`:

```
/var/log/vortex*.log
/var/log/nginx/vortex*.log
{
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

## 10. Health Checks

```bash
# Check backend health
curl https://vortex.internal/api/health

# Check frontend
curl -k https://vortex.internal

# Check PostgreSQL connection
docker-compose exec db pg_isready -U vortex_user

# Check Redis connection
docker-compose exec redis redis-cli ping
```

## 11. Monitoring Commands

```bash
# Memory and CPU usage
docker stats

# Disk usage
du -sh /opt/vortex
df -h /

# Database size
docker-compose exec db psql -U vortex_user -c "SELECT pg_size_pretty(pg_database_size('vortex'));"

# Check active WebSocket connections
netstat -tln | grep 8000
```

## 12. Upgrade Process

```bash
cd /opt/vortex

# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build

# Apply database migrations (if any)
docker-compose exec backend python -c "from database import init_db; init_db()"

# Restart services
docker-compose down
docker-compose up -d
```

## 13. Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec backend python -c "from database import SessionLocal; print('✓ DB connected')"
```

### Frontend not loading
```bash
# Clear browser cache
# Check REACT_APP_API_URL in .env is correct
# Verify Nginx is running: systemctl status nginx
```

### Database issues
```bash
# Connect to database
docker-compose exec db psql -U vortex_user -d vortex

# Run backup
/opt/vortex/backup.sh

# Restore from backup
docker-compose exec db psql -U vortex_user -d vortex < backup_file.sql
```

### WebSocket connection fails
```bash
# Check WebSocket is accessible
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://vortex.internal/ws/alerts
```

## 14. Security Best Practices

- [ ] Change default admin password
- [ ] Update JWT_SECRET_KEY in .env
- [ ] Use strong database password
- [ ] Enable firewall: `sudo ufw allow 22,80,443/tcp`
- [ ] Set up SSL certificate correctly
- [ ] Regular backups (automated via cron)
- [ ] Monitor logs for suspicious activity
- [ ] Keep Docker/system updated
- [ ] Use VPN or internal network for access
- [ ] Implement role-based access control

## 15. Performance Tuning

### PostgreSQL
```bash
# Connect and optimize
docker-compose exec db psql -U vortex_user -d vortex

# Analyze tables
ANALYZE;
VACUUM ANALYZE;

# Check index usage
SELECT * FROM pg_stat_user_indexes;
```

### Redis
```bash
# Monitor Redis memory
docker-compose exec redis redis-cli INFO memory

# Configure max memory policy in docker-compose
redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Nginx
```bash
# Update worker processes based on CPU cores
sudo nano /etc/nginx/nginx.conf
worker_processes auto;

# Increase connections
worker_connections 2048;
```

---

**Need Help?** Check logs, verify configuration, and consult the README.md for API documentation.
