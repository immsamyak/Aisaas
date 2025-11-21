#!/bin/bash

# Complete Nginx and SSL setup
set -e

DOMAIN="aisaas.alvicsinfo.tech"
BACKEND_PORT=5000
FRONTEND_PORT=3000

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "================================================"
echo "Finishing Nginx and SSL Setup"
echo "================================================"
echo ""

# Remove default nginx config
sudo rm -f /etc/nginx/sites-enabled/default

# Create nginx configuration
sudo tee /etc/nginx/sites-available/ai-shorts > /dev/null <<'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Backend upstream
upstream backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# Frontend upstream
upstream frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name aisaas.alvicsinfo.tech;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/ai-shorts-access.log;
    error_log /var/log/nginx/ai-shorts-error.log;

    # API routes
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for video processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # File upload size
        client_max_body_size 500M;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/ai-shorts /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

# Install certbot if not already installed
echo ""
echo "Installing SSL certificate..."
if ! command -v certbot &> /dev/null; then
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Obtain SSL certificate
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect

echo -e "${GREEN}✅ SSL certificate installed${NC}"

# Setup PM2 startup
pm2 startup systemd -u aisaas --hp /home/aisaas

echo ""
echo "================================================"
echo "🎉 Setup Complete!"
echo "================================================"
echo ""
echo "Your AI Shorts Video Generator is now running!"
echo ""
echo "Access your application at:"
echo -e "${GREEN}https://${DOMAIN}${NC}"
echo ""
echo "Service Status:"
pm2 status
echo ""
echo "Useful Commands:"
echo "  View logs:        pm2 logs"
echo "  View backend:     pm2 logs ai-shorts-backend"
echo "  View worker:      pm2 logs ai-shorts-worker"
echo "  View frontend:    pm2 logs ai-shorts-frontend"
echo "  Restart all:      pm2 restart all"
echo "  Stop all:         pm2 stop all"
echo ""
