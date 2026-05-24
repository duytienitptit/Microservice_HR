#!/bin/bash
set -e

# Create certs directory if not exists
mkdir -p certs

# Generate self-signed key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/nginx.key \
  -out certs/nginx.crt \
  -subj "/C=VN/ST=Hanoi/L=Hanoi/O=AI-HR-Recruiter/CN=localhost"

echo "Certificates generated successfully in api-gateway/certs/"
