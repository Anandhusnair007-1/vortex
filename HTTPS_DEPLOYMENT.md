# Vortex HTTPS Production Deployment Guide

## Overview
This guide walks you through deploying Vortex with HTTPS, proper security configuration, and fixing remote access issues.

## Architecture

```
┌─────────────────────────────────────────┐
│  Remote Users LAN (10.0.0.0/8)          │
└───────────────┬─────────────────────────┘
                │ HTTPS/WSS
                ▼
┌─────────────────────────────────────────┐
│  Nginx Reverse Proxy (Port 443)         │
│  - SSL/TLS Termination                  │
│  - Security Headers (HSTS, etc)         │
│  - Rate Limiting                        │
│  - Request Routing                      │
└──────┬────────────────────────┬──────────┘
       │                        │
       ▼                        ▼
  ┌──────────┐          ┌──────────────┐
  │ Backend  │          │  Frontend    │
  │ FastAPI │          │  React 3000  │
  │ :8000   │          │              │
  └──┬───┬──┘          └──────────────┘
     │   │
     │   └─► PostgreSQL DB
     │   └─► Redis Cache
     │
     └─► External HTTPS Services:
         - Proxmox (verify SSL)
         - RFID Devices (HTTPS)
         - phpIPAM (HTTPS)
         - Guacamole (HTTPS)
         - AWX (HTTPS)
         - Observium (HTTPS)
```

## Step 1: Generate SSL Certificates

### Option A: Self-Signed Certificate (Development/Testing)

```bash
cd /home/anandhu/Downloads/vortex-main
bash generate-certs.sh
```

Follow the prompts:
- **Country**: US
- **State**: CA
- **City**: San Francisco
- **Organization**: Vortex
- **Common Name**: Your server IP (e.g., 10.0.0.100)
- **Alternative Names**: domain.internal (optional)

This creates `./certs/cert.pem` and `./certs/key.pem`

### Option B: Production Certificate (Let's Encrypt)

For production, use Certbot:

```bash
# Install Certbot
sudo apt-get install certbot

# Request certificate
sudo certbot certonly --standalone -d vortex.example.com

# Copy to certs directory
mkdir -p certs
sudo cp /etc/letsencrypt/live/vortex.example.com/fullchain.pem certs/cert.pem
sudo cp /etc/letsencrypt/live/vortex.example.com/privkey.pem certs/key.pem
sudo chown $(whoami):$(whoami) certs/*
```

## Step 2: Configure Environment

Copy production environment file:

```bash
cd /home/anandhu/Downloads/vortex-main
cp .env.production .env
```

Edit `.env` and set these required values:

```bash
# Change these to your deployment values:
SERVER_IP=10.0.0.100              # Your actual server IP
SERVER_DOMAIN=vortex.internal     # Your domain name (can be same as IP)

# Generate secure secrets:
JWT_SECRET_KEY=<generate-new-secret>
POSTGRES_PASSWORD=<generate-strong-password>
RFID_CREDENTIALS_KEY=<generate-encryption-key>

# Keep these for production:
PROXMOX_VERIFY_SSL=true          # CRITICAL: Enable SSL verification
CORS_ORIGINS=https://vortex.internal,https://10.0.0.100,http://localhost:3000
ALLOWED_HOSTS=vortex.internal,10.0.0.100,localhost,127.0.0.1
```

### Generate Secure Secrets

```bash
# JWT Secret (32 bytes hex)
openssl rand -hex 32

# Database Password (32 bytes base64)
openssl rand -base64 32

# RFID Encryption Key (Fernet base64)
python3 -c "import secrets; import base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

## Step 3: Update DNS/Hosts (If Using Domain)

If using a domain name, add to your hosts file:

```bash
# On client machines:
echo "10.0.0.100 vortex.internal" | sudo tee -a /etc/hosts
```

Or configure DNS server to resolve `vortex.internal` to `10.0.0.100`.

## Step 4: Start the Application

```bash
cd /home/anandhu/Downloads/vortex-main

# Pull latest images
docker-compose pull

# Start all services (nginx, backend, frontend, db, redis)
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 5: Verify Everything Works

### From the Server (localhost):

```bash
# Test backend API
curl -v https://localhost/api/health

# This will show certificate verification warning (expected for self-signed)
# Add -k flag to bypass: curl -k https://localhost/api/health
```

### From Remote Client (test different IPs):

```bash
# Using IP address
curl -k https://10.0.0.100/api/health

# Using domain name
curl -k https://vortex.internal/api/health

# WebSocket test
wscat -c wss://10.0.0.100/api/ws

# Frontend access (open in browser)
https://10.0.0.100
https://vortex.internal
```

### Browser Access

1. Navigate to `https://10.0.0.100` or `https://vortex.internal`
2. Accept the security warning (self-signed certificate)
3. Login with default credentials
4. Verify all features work

## Security Checklist

✅ **HTTPS/TLS**
- [ ] Nginx reverse proxy configured with SSL
- [ ] Certificates in place and valid
- [ ] All traffic redirected from HTTP to HTTPS

✅ **Backend Security**
- [ ] JWT_SECRET_KEY set (32+ characters)
- [ ] Database password strong (16+ characters)
- [ ] PROXMOX_VERIFY_SSL=true
- [ ] DEBUG=false
- [ ] INTERNAL_AUTH_BYPASS=false
- [ ] CORS_ORIGINS restricted to known domains
- [ ] ALLOWED_HOSTS  restricted to known hosts

✅ **Network Security**
- [ ] SSH key-based authentication only
- [ ] Firewall rules:
  - [ ] Port 443 (HTTPS) - Open to LAN
  - [ ] Port 80 (HTTP) - Open (redirects to HTTPS)
  - [ ] Port 8000, 3000 - Closed (only internal)
  - [ ] Port 5432 (PostgreSQL) - Closed (container network only)
- [ ] VPN/Bastion access for remote administration

✅ **External Service Communication**
- [ ] Proxmox: PROXMOX_VERIFY_SSL=true
- [ ] RFID Devices: Use HTTPS endpoints
- [ ] phpIPAM: Use HTTPS URLs
- [ ] Guacamole: Use HTTPS URLs
- [ ] AWX: Use HTTPS URLs

## Troubleshooting Remote Access Issues

### Problem: Curl timeout when accessing via IP address

**Solution Checklist:**
1. Verify nginx container is running:
   ```bash
   docker ps | grep nginx
   ```

2. Check nginx logs:
   ```bash
   docker-compose logs nginx
   ```

3. Verify certificates exist:
   ```bash
   ls -la certs/
   ```

4. Test from server first (using localhost):
   ```bash
   curl -k https://localhost/api/health
   ```

5. Check firewall allows port 443:
   ```bash
   sudo ufw allow 443/tcp
   sudo ufw allow 80/tcp
   ```

6. Verify DNS resolution:
   ```bash
   nslookup vortex.internal
   # or just use IP directly
   curl -k https://10.0.0.100/api/health
   ```

### Problem: RFID devices can't connect

**Solution:**
- Ensure RFID_SHARED credentials are set
- Verify RFID device URLs use HTTPS
- Test RFID connectivity from backend:
  ```bash
  docker-compose exec backend python -c "
  from services.rfid_adapter import RFIDAdapter
  rfid = RFIDAdapter()
  rfid.health_check()
  "
  ```

### Problem: Proxmox integration fails

**Solution:**
- Verify PROXMOX_VERIFY_SSL is in .env
- Test Proxmox connection:
  ```bash
  docker-compose exec backend python -c "
  from services.proxmox_service import ProxmoxService
  px = ProxmoxService()
  px.test_connection()
  "
  ```

## Database Migration for Email Field

The User model now requires an email field. Run migration:

```bash
# SSH into server or connect to container
docker-compose exec backend alembic upgrade head
```

## Certificate Renewal (Let's Encrypt)

For production certificates, set up auto-renewal:

```bash
# Copy certificate to certs directory automatically
sudo certbot renew --deploy-hook "docker-compose restart nginx"
```

## Monitoring and Logging

Monitor application health:

```bash
# View logs
docker-compose logs -f backend

# Check metrics
docker-compose exec backend curl http://localhost:8000/api/health

# Monitor nginx access/errors
docker-compose logs -f nginx
```

## Production Best Practices

1. **Backups**: Automate PostgreSQL backups
   ```bash
   docker-compose exec db pg_dump -U vortex_user vortex > backup-$(date +%Y%m%d).sql
   ```

2. **Updates**: Keep containers updated
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

3. **Monitoring**: Set up alerts for:
   - High CPU/memory usage
   - Failed authentication attempts
   - Certificate expiration
   - Service health

4. **Logs**: Centralize logs using ELK, Splunk, or similar

5. **Access Control**: Use strong passwords, SSH keys, and 2FA

## Support

For issues or questions:
1. Check logs: `docker-compose logs --tail=100`
2. Review ARCHITECTURE.md and RUNBOOK.md
3. Test connectivity: `curl -v https://IP/api/health`
4. Verify environment: `docker-compose config`
