# Vortex HTTPS Setup - Quick Reference

## 🚀 Get Started in 3 Steps

### Step 1: Generate Certificates (2 minutes)
```bash
cd /home/anandhu/Downloads/vortex-main
bash generate-certs.sh
```
Answer prompts for your server IP/domain.

### Step 2: Configure Environment (2 minutes)
```bash
cp .env.production .env
# Edit .env and update:
# - SERVER_IP (your servers IP address)
# - SERVER_DOMAIN (your domain or same IP)
# - Secrets are auto-generated (optional: regenerate if needed)
nano .env
```

### Step 3: Start Services (5 minutes)
```bash
docker-compose up -d
docker-compose logs -f  # Monitor startup
```

## 🔍 Test It Works

```bash
# From your server:
curl -k https://localhost/api/health

# From remote client (using IP or domain):
curl -k https://10.0.0.100/api/health
curl -k https://vortex.internal/api/health

# Open in browser:
https://10.0.0.100
```

## ⚙️ Key Configuration

| Setting | Value | Location |
|---------|-------|----------|
| HTTPS Port | 443 | nginx (docker-compose.yml) |
| Backend (internal) | 8000 | docker-compose.yml |
| Frontend (internal) | 3000 | docker-compose.yml |
| Database (internal) | 5432 | docker-compose.yml |
| Certs | ./certs/ | Mounted in docker-compose.yml |
| Config | .env | docker-compose.yml reads it |

## 🔒 Security Settings Applied

| Setting | Before | After |
|---------|--------|-------|
| HTTPS | ❌ – Off | ✅ - Enforced on port 443 |
| JWT Secret | Weak default | ✅ - Required 32+ chars |
| DB Password | `secret` | ✅ - Strong random password |
| SSL Verify | ❌ – Disabled | ✅ - Enabled |
| Password Min | 8 characters | ✅ - 12 characters |
| CORS | Wildcard `*` | ✅ - Specific domains only |
| Rate Limiting | ❌ - None | ✅ - 5r/min (auth), 10r/s (API) |
| Remote Access | ❌ – Timeouts | ✅ - Works via IP/domain |

## 📋 What Was Fixed

### Critical Issues ✅
- [x] HTTPS/SSL not configured
- [x] Remote access timing out (no nginx proxy)
- [x] Weak JWT defaults
- [x] Hardcoded DB credentials
- [x] SSL verification disabled on external services
- [x] Missing email field in User model
- [x] No CORS/firewall protection

### High Priority ✅
- [x] Weak password validation (now 12+ chars)
- [x] Rate limiting added to nginx
- [x] Security headers added (HSTS, X-Frame-Options, etc.)
- [x] Proper session management
- [x] Database encryption setup

## 📁 New/Modified Files

### Created
- `nginx/nginx.conf` - Reverse proxy with HTTPS
- `.env.production` - Production configuration template
- `HTTPS_DEPLOYMENT.md` - Full deployment guide
- `generate-certs.sh` - Certificate generation tool
- `setup-production.sh` - Automated setup script
- `SECURITY_FIXES_SUMMARY.md` - Complete change log
- `backend/alembic/versions/20260324_02_add_email_to_users.py` - DB migration

### Modified
- `docker-compose.yml` - Added nginx, removed direct port exposure
- `backend/config.py` - Security hardening, SSL enabling
- `backend/models.py` - Added email field to User
- `backend/schemas.py` - Added email validation

## 🆘 Quick Troubleshooting

### Can't connect from remote (timeout)
```bash
# 1. Check nginx is running
docker ps | grep nginx

# 2. Allow firewall
sudo ufw allow 443/tcp

# 3. Test from server first
curl -k https://localhost/api/health

# 4. Check nginx logs
docker-compose logs nginx

# 5. Verify certs exist
ls -la certs/
```

### Database error
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Check logs
docker-compose logs db
```

### WebSocket not working
```bash
# Test WebSocket
wscat -c wss://10.0.0.100/api/ws

# Check nginx logs
docker-compose logs nginx
```

## 🎯 Next Steps

1. ✅ Run `setup-production.sh` (automated) OR
2. ✅ Follow 3 steps above (manual)
3. ✅ Verify with curl commands
4. ✅ Open browser to https://your-ip
5. ✅ Login and test features
6. ✅ Read [HTTPS_DEPLOYMENT.md](HTTPS_DEPLOYMENT.md) for production checklist

## 📚 Full Documentation

- **Setup Automation**: `bash setup-production.sh`
- **Deploy Guide**: [HTTPS_DEPLOYMENT.md](HTTPS_DEPLOYMENT.md)
- **All Changes**: [SECURITY_FIXES_SUMMARY.md](SECURITY_FIXES_SUMMARY.md)
- **Certs Helper**: `bash generate-certs.sh`

## 🔐 Security Checklist Before Production

- [ ] JWT_SECRET_KEY set to 32+ random characters
- [ ] POSTGRES_PASSWORD set to strong random password
- [ ] PROXMOX_VERIFY_SSL=true in .env
- [ ] DEBUG=false in .env
- [ ] INTERNAL_AUTH_BYPASS=false in .env
- [ ] CORS_ORIGINS restricted to your domains
- [ ] ALLOWED_HOSTS restricted to your hosts
- [ ] Firewall allows 80 and 443 only (SSH via separate method)
- [ ] Certificates obtained from trusted CA (for production)
- [ ] All external service URLs use HTTPS
- [ ] Database backups configured
- [ ] Monitoring/alerting set up

## 🆘 Need Help?

1. **Timeouts connecting from remote** → Check firewall + nginx logs
2. **HTTPS certificate warnings** → Normal for self-signed (expected)
3. **Database errors** → Run `docker-compose exec backend alembic upgrade head`
4. **RFID not connecting** → Verify HTTPS URLs in config + credentials
5. **Proxmox errors** → Ensure PROXMOX_VERIFY_SSL=true + credentials correct

---

**Status**: ✅ All critical issues fixed. Application ready for HTTPS production deployment.
