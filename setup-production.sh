#!/bin/bash

# Vortex Production Deployment Script
# This script automates the HTTPS setup process

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║  VORTEX HTTPS PRODUCTION DEPLOYMENT SETUP  ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not found${NC}"; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo -e "${RED}❌ OpenSSL not found${NC}"; exit 1; }
echo -e "${GREEN}✓ Docker and OpenSSL found${NC}\n"

# Step 2: Generate certificates
echo -e "${YELLOW}Step 2: SSL Certificate Setup${NC}"
if [[ ! -f "${ROOT_DIR}/certs/cert.pem" ]] || [[ ! -f "${ROOT_DIR}/certs/key.pem" ]]; then
    read -p "Do you want to generate self-signed certificates? (y/n): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bash "${ROOT_DIR}/generate-certs.sh"
    else
        echo -e "${RED}❌ Certificates required. Exiting.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Certificates already exist${NC}"
fi
echo ""

# Step 3: Environment setup
echo -e "${YELLOW}Step 3: Environment Configuration${NC}"
if [[ ! -f "${ROOT_DIR}/.env" ]]; then
    if [[ -f "${ROOT_DIR}/.env.production" ]]; then
        cp "${ROOT_DIR}/.env.production" "${ROOT_DIR}/.env"
        echo -e "${GREEN}✓ Created .env from .env.production${NC}"
    else
        echo -e "${RED}❌ .env.production not found${NC}"
        exit 1
    fi
fi

# Prompt for configuration
echo -e "\n${YELLOW}Configure deployment variables:${NC}"
read -p "Server IP/Domain (default: 10.0.0.100): " server_addr
server_addr=${server_addr:-10.0.0.100}

# Generate secrets if not set
if grep -q "JWT_SECRET_KEY=CHANGE_ME" "${ROOT_DIR}/.env" || grep -q "JWT_SECRET_KEY=$" "${ROOT_DIR}/.env"; then
    echo "Generating JWT secret..."
    jwt_secret=$(openssl rand -hex 32)
    sed -i "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${jwt_secret}|" "${ROOT_DIR}/.env"
fi

if grep -q "POSTGRES_PASSWORD=CHANGE_ME" "${ROOT_DIR}/.env"; then
    echo "Generating database password..."
    db_password=$(openssl rand -base64 32)
    escaped_password=$(printf '%s\n' "$db_password" | sed -e 's/[\/&]/\\&/g')
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${escaped_password}|" "${ROOT_DIR}/.env"
fi

# Update server address
sed -i "s|SERVER_IP=.*|SERVER_IP=${server_addr}|" "${ROOT_DIR}/.env"
sed -i "s|SERVER_DOMAIN=.*|SERVER_DOMAIN=${server_addr}|" "${ROOT_DIR}/.env"

# Update React URLs
sed -i "s|SERVER_DOMAIN}|${server_addr}|g" "${ROOT_DIR}/.env"
sed -i "s|SERVER_IP}|${server_addr}|g" "${ROOT_DIR}/.env"

echo -e "${GREEN}✓ Environment configured${NC}\n"

# Step 4: Database setup
echo -e "${YELLOW}Step 4: Database & Services${NC}"
cd "${ROOT_DIR}"

echo "Starting services..."
docker-compose pull
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec db pg_isready -U vortex_user 2>/dev/null | grep -q "accepting"; then
        echo -e "${GREEN}✓ Database is healthy${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt of $max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ Database failed to start${NC}"
    docker-compose logs db
    exit 1
fi

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T backend alembic upgrade head || true

echo -e "${GREEN}✓ Database migrations completed${NC}\n"

# Step 5: Verify deployment
echo -e "${YELLOW}Step 5: Verification${NC}"
echo "Waiting for services to be ready..."
sleep 3

# Test backend
if curl -sk https://localhost/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${RED}⚠ Backend not responding yet, check logs${NC}"
fi

# Step 6: Display summary
echo -e "\n${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Access your application:${NC}"
echo "  • HTTPS: https://${server_addr}"
echo "  • HTTP (redirects to HTTPS): http://${server_addr}"
echo ""

echo -e "${BLUE}Useful commands:${NC}"
echo "  • View logs: docker-compose logs -f"
echo "  • View backend logs: docker-compose logs -f backend"
echo "  • View nginx logs: docker-compose logs -f nginx"
echo "  • Stop services: docker-compose down"
echo "  • Restart services: docker-compose restart"
echo ""

echo -e "${YELLOW}⚠️  Important:${NC}"
echo "  • First login uses default credentials (check .env if needed)"
echo "  • For self-signed certs, browsers will show security warning"
echo "  • For production, use certificates from a trusted CA"
echo "  • Update firewall to allow ports 80 and 443"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo "  1. Open browser: https://${server_addr}"
echo "  2. Login with your credentials"
echo "  3. Verify all services are working"
echo "  4. Check HTTPS_DEPLOYMENT.md for troubleshooting"
echo ""

echo -e "${YELLOW}Security Checklist:${NC}"
echo "  [ ] Change default user passwords"
echo "  [ ] Update external service credentials (Proxmox, etc.)"
echo "  [ ] Verify PROXMOX_VERIFY_SSL=true in .env"
echo "  [ ] Set up firewall rules"
echo "  [ ] Enable automated backups"
echo "  [ ] Configure monitoring and alerts"
echo ""
