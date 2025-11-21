#!/bin/bash

# Continue installation script from frontend build step
# Run this after fixing the .babelrc issue

set -e

PROJECT_DIR="/home/aisaas/ai-shorts-generator"
DOMAIN="aisaas.alvicsinfo.tech"
BACKEND_PORT=5000
WORKER_PORT=5001
FRONTEND_PORT=3000

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "================================================"
echo "Continuing Installation from Frontend Build"
echo "================================================"
echo ""

# Pull latest changes
cd $PROJECT_DIR
echo "ℹ️  Pulling latest changes from GitHub..."
git pull origin main
echo -e "${GREEN}✅ Changes pulled${NC}"

# Step 13: Building Frontend
echo ""
echo "================================================"
echo "Step 13: Building Frontend"
echo "================================================"
echo ""
cd $PROJECT_DIR/frontend
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Step 14: Setting up PM2
echo ""
echo "================================================"
echo "Step 14: Setting up PM2"
echo "================================================"
echo ""
cd $PROJECT_DIR

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start backend
cd $PROJECT_DIR/backend
pm2 start src/server.js --name "ai-shorts-backend" --node-args="--max-old-space-size=2048"

# Start worker
cd $PROJECT_DIR/worker
pm2 start src/worker.js --name "ai-shorts-worker" --node-args="--max-old-space-size=2048"

# Start frontend
cd $PROJECT_DIR/frontend
pm2 start npm --name "ai-shorts-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup systemd -u aisaas --hp /home/aisaas

echo -e "${GREEN}✅ PM2 processes started${NC}"
pm2 status

# Step 15: Configure Nginx
echo ""
echo "================================================"
echo "Step 15: Configuring Nginx"
echo "================================================"
echo ""

# Remove default nginx config if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Create nginx configuration
sudo tee /etc/nginx/sites-available/ai-shorts > /dev/null <<EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Backend upstream
upstream backend {
    server 127.0.0.1:${BACKEND_PORT};
    keepalive 64;
}

# Frontend upstream
upstream frontend {
    server 127.0.0.1:${FRONTEND_PORT};
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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

# Step 16: SSL Certificate
echo ""
echo "================================================"
echo "Step 16: Installing SSL Certificate"
echo "================================================"
echo ""

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Obtain SSL certificate
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect

echo -e "${GREEN}✅ SSL certificate installed${NC}"

# Step 17: Setup log rotation
echo ""
echo "================================================"
echo "Step 17: Setting up Log Rotation"
echo "================================================"
echo ""

sudo tee /etc/logrotate.d/ai-shorts > /dev/null <<EOF
${PROJECT_DIR}/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 aisaas aisaas
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

${PROJECT_DIR}/worker/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 aisaas aisaas
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo -e "${GREEN}✅ Log rotation configured${NC}"

# Step 18: Setup monitoring
echo ""
echo "================================================"
echo "Step 18: Setting up Monitoring"
echo "================================================"
echo ""

# Install PM2 web dashboard
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

echo -e "${GREEN}✅ Monitoring configured${NC}"

# Step 19: Final checks
echo ""
echo "================================================"
echo "Step 19: Running Final Checks"
echo "================================================"
echo ""

# Check MongoDB
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${RED}❌ MongoDB is not running${NC}"
fi

# Check Redis
if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running${NC}"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
fi

# Check PM2 processes
echo ""
echo "PM2 Process Status:"
pm2 status

# Check if services are responding
echo ""
echo "Testing service endpoints..."
sleep 5

if curl -f http://localhost:${BACKEND_PORT}/health &>/dev/null; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may still be starting up${NC}"
fi

if curl -f http://localhost:${FRONTEND_PORT} &>/dev/null; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting up${NC}"
fi

# Step 20: Installation Complete
echo ""
echo "================================================"
echo "🎉 Installation Complete!"
echo "================================================"
echo ""
echo "Your AI Shorts Video Generator is now running!"
echo ""
echo "Access your application at:"
echo -e "${GREEN}https://${DOMAIN}${NC}"
echo ""
echo "Service URLs:"
echo "  Frontend:  https://${DOMAIN}"
echo "  Backend:   https://${DOMAIN}/api"
echo ""
echo "Useful Commands:"
echo "  View logs:        pm2 logs"
echo "  View backend:     pm2 logs ai-shorts-backend"
echo "  View worker:      pm2 logs ai-shorts-worker"
echo "  View frontend:    pm2 logs ai-shorts-frontend"
echo "  Restart all:      pm2 restart all"
echo "  Stop all:         pm2 stop all"
echo "  Process status:   pm2 status"
echo "  Monitor:          pm2 monit"
echo ""
echo "Credentials saved in: /home/aisaas/ai-shorts-credentials.txt"
echo ""
echo -e "${YELLOW}Important: Save your credentials securely and delete the credentials file!${NC}"
echo ""
