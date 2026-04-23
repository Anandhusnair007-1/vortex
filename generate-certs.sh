#!/bin/bash

# SSL Certificate Generation Script for Vortex
# This script generates self-signed SSL certificates for development/testing
# For production, use certificates from a trusted CA (Let's Encrypt, etc.)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/certs"
DAYS_VALID=365

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Vortex SSL Certificate Generator ===${NC}\n"

# Create certs directory if it doesn't exist
mkdir -p "${CERT_DIR}"

# Check if certificates already exist
if [[ -f "${CERT_DIR}/cert.pem" ]] && [[ -f "${CERT_DIR}/key.pem" ]]; then
    echo -e "${YELLOW}⚠️  Certificates already exist in ${CERT_DIR}${NC}"
    read -p "Do you want to regenerate them? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ Using existing certificates${NC}"
        exit 0
    fi
    echo "Removing old certificates..."
    rm -f "${CERT_DIR}/cert.pem" "${CERT_DIR}/key.pem"
fi

# Get certificate details
echo "Enter certificate details (press Enter for defaults):"
read -p "Country (US): " country
country=${country:-US}

read -p "State (CA): " state
state=${state:-CA}

read -p "City (San Francisco): " city
city=${city:-San Francisco}

read -p "Organization (Vortex): " org
org=${org:-Vortex}

read -p "Common Name (10.0.0.100 or domain): " cn
cn=${cn:-10.0.0.100}

read -p "Alternative names (comma-separated, optional): " alt_names
: "${alt_names:=}"

echo ""
echo -e "${YELLOW}Generating self-signed certificate...${NC}"

# Build subject
SUBJECT="/C=${country}/ST=${state}/L=${city}/O=${org}/CN=${cn}"

# Build SAN (Subject Alternative Names) if provided
SAN_CONFIG=""
if [[ -n "${alt_names}" ]]; then
    IFS=',' read -ra NAMES <<< "${alt_names}"
    SAN="DNS:${cn}"
    for name in "${NAMES[@]}"; do
        name=$(echo "$name" | xargs)  # Trim whitespace
        if [[ -n "${name}" ]]; then
            SAN="${SAN},DNS:${name}"
        fi
    done
    SAN_CONFIG="-addext \"subjectAltName=${SAN}\""
fi

# Generate private key
openssl genrsa -out "${CERT_DIR}/key.pem" 2048 2>/dev/null

# Generate self-signed certificate
openssl req -new -x509 \
    -key "${CERT_DIR}/key.pem" \
    -out "${CERT_DIR}/cert.pem" \
    -days "${DAYS_VALID}" \
    -subj "${SUBJECT}" \
    ${SAN_CONFIG} \
    2>/dev/null

# Display certificate information
echo -e "\n${GREEN}✓ Certificate generated successfully!${NC}\n"
echo "Certificate Details:"
openssl x509 -in "${CERT_DIR}/cert.pem" -noout -text | grep -A 2 -E "Subject:|Issuer:|Not Before|Not After|Subject Alternative"

echo -e "\n${GREEN}Certificate files created:${NC}"
echo "  - Private Key: ${CERT_DIR}/key.pem"
echo "  - Public Certificate: ${CERT_DIR}/cert.pem"

echo -e "\n${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  • This is a self-signed certificate for development/testing only"
echo "  • Browsers will show a security warning"
echo "  • For production, use certificates from a trusted CA"
echo "  • Update your DNS/hosts file if using domain names"

echo -e "\n${GREEN}Next steps:${NC}"
echo "  1. Copy certificates to: ${CERT_DIR}/"
echo "  2. Update .env with SERVER_IP and SERVER_DOMAIN"
echo "  3. Run: docker-compose -f docker-compose.yml up -d"
