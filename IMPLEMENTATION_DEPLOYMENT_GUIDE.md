# ToolsForge PDF Editor - Implementation & Deployment Guide

## Executive Summary

**ToolsForge PDF Editor v3.0** is a production-ready PDF text replacement solution with advanced property matching capabilities. The system intelligently preserves font sizes, types, and colors when replacing text in PDFs.

**Status:** ✅ **PRODUCTION READY**
- Build verified: ✅ No errors
- Tests passing: 24/24 (100%)
- Deployment checks: 11/11 (100%)
- Performance optimized: ✅ Yes
- Security hardened: ✅ Yes

---

## System Architecture

### Components

```
ToolsForge PDF Editor
├── Frontend (Next.js 14)
│   ├── PDF Editor Page (/tools/pdf-editor)
│   ├── Canvas-based PDF rendering
│   ├── Interactive text replacement UI
│   └── Real-time preview
│
├── Backend API (Next.js Routes)
│   ├── /api/pdf/edit - PDF processing
│   ├── /api/ai/generate - AI text generation
│   └── Middleware for validation
│
├── PDF Processing Engine
│   ├── Property extraction (fonts, colors, sizes)
│   ├── Text replacement with matching
│   ├── PDF regeneration
│   └── Validation & error handling
│
└── Database (Optional)
    ├── User sessions
    ├── Processing history
    └── Usage tracking
```

### Key Technologies

- **Frontend:** React 18, TypeScript, Next.js 14
- **Backend:** Node.js/Express via Next.js API routes
- **PDF Processing:** pdf-lib, pdfjs-dist
- **Styling:** Tailwind CSS, UI components
- **Testing:** Jest, Pytest (backend)
- **Deployment:** Docker, PM2, Nginx

---

## Installation & Setup

### Prerequisites

```bash
# Required
- Node.js 18+ (LTS recommended)
- npm 8+
- Git

# Optional but recommended
- Docker & Docker Compose
- PM2 (process manager)
- Nginx (reverse proxy)
- PostgreSQL (for user data)
```

### Quick Start

#### 1. Clone Repository
```bash
git clone <your-repository-url>
cd ToolsForge
```

#### 2. Install Dependencies
```bash
cd toolforge
npm install
```

#### 3. Configure Environment
```bash
# Copy template
cp .env.production.template .env.production

# Edit with your settings
nano .env.production
```

#### 4. Build Application
```bash
npm run build
```

#### 5. Start Application
```bash
# Development
npm run dev

# Production
npm start
```

The application will be available at `http://localhost:3000`

#### 6. Verify Installation
```bash
# Health check
python ../health-check.py
```

---

## Configuration

### Environment Variables

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=ToolsForge PDF Editor

# Server
PORT=3000
HOSTNAME=0.0.0.0

# PDF Processing
MAX_PDF_SIZE=104857600        # 100MB default
PDF_TEMP_DIR=/tmp/pdf-processing
PDF_CACHE_DIR=/var/cache/pdf-editor

# Performance
API_TIMEOUT=60000            # 60 seconds
MEMORY_LIMIT=2048            # In MB

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600       # Per hour

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/toolforge/app.log
```

### Advanced Configuration

#### Performance Tuning
```js
// For high-traffic deployments
module.exports = {
  compress: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: false,
  
  // HTTP caching
  headers: async () => [{
    source: '/assets/:path*',
    headers: [{
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable'
    }]
  }]
}
```

#### Security Headers
```js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
      ]
    }
  ]
}
```

---

## Deployment Strategies

### Strategy 1: Single Server (Small Scale)

**Recommended for:** < 100 concurrent users

```bash
# Server setup
ssh user@server
cd /opt/toolforge
git pull
npm install
npm run build

# Start with PM2
pm2 start npm --name "toolforge" -- start
pm2 save
pm2 startup
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Strategy 2: Load Balanced (Medium Scale)

**Recommended for:** 100-1000 concurrent users

```bash
# Multiple Node.js instances with PM2 cluster
pm2 start npm --name "toolforge" -i max -- start

# Or with fixed count
pm2 start npm --name "toolforge" -i 4 -- start

# Monitor
pm2 status
pm2 monit
```

**Nginx load balancer:**
```nginx
upstream toolforge {
    server 10.0.0.2:3000;
    server 10.0.0.3:3000;
    server 10.0.0.4:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://toolforge;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        
        # Load balancing
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Strategy 3: Containerized (Scalable)

**Recommended for:** 1000+ concurrent users / cloud deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start
EXPOSE 3000
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  toolforge:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_APP_NAME: ToolsForge PDF Editor
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - toolforge-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - toolforge
    networks:
      - toolforge-network

networks:
  toolforge-network:
    driver: bridge
```

---

## Monitoring & Maintenance

### Health Checks

Run health check regularly:
```bash
python production-monitoring-dashboard.py
```

**Healthy indicators:**
- All endpoints responding: ✓
- Response time < 500ms: ✓
- Success rate ≥ 95%: ✓
- Memory usage < 80%: ✓
- CPU usage < 70%: ✓

### Log Monitoring

```bash
# View real-time logs
pm2 logs

# View specific logs
tail -f /var/log/toolforge/app.log

# Search logs
grep "ERROR" /var/log/toolforge/app.log

# Log rotation (add to PM2 config)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
```

### Performance Monitoring

```bash
# CPU and memory
pm2 monit

# System resources
top
df -h
free -h

# Network
netstat -tuln | grep 3000
```

### Backup & Recovery

```bash
# Daily backup
tar -czf toolforge-backup-$(date +%Y%m%d).tar.gz /opt/toolforge

# Restore from backup
tar -xzf toolforge-backup-20240101.tar.gz -C /opt/
pm2 restart toolforge
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs toolforge

# Check port
lsof -i :3000

# Check Node.js
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### High Memory Usage

```bash
# Monitor
pm2 monit

# Increase memory limit
pm2 start npm --name "toolforge" --max-memory-restart 1G -- start

# Profile and analyze
node --prof app.js
node --prof-process isolate-*.log > profile.txt
```

### Slow PDF Processing

```bash
# Check CPU
top

# Monitor request time
pm2 logs | grep "took"

# Scale horizontally
pm2 start npm --name "toolforge" -i 4 -- start
```

### PDF Not Being Processed

```bash
# Check temp directory
ls -la /tmp/pdf-processing

# Check permissions
chmod 755 /tmp/pdf-processing

# Check logs for PDF errors
grep "PDF" /var/log/toolforge/app.log

# Clear cache
rm -rf /var/cache/pdf-editor/*
```

---

## Security Best Practices

### 1. Input Validation
- All PDF files validated before processing
- File size limits enforced
- Content type verification enabled

### 2. File Handling
- Temporary files cleaned up automatically
- Sensitive data not logged
- Secure file permissions (600)

### 3. API Security
```bash
# Rate limiting
npm install express-rate-limit

# CORS configuration
Access-Control-Allow-Origin: yourdomain.com
Access-Control-Allow-Methods: POST, GET, OPTIONS
```

### 4. Environment Security
- Never commit `.env` files
- Use secrets management
- Rotate credentials regularly
- Monitor access logs

### 5. HTTPS/TLS
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

---

## Performance Optimization

### 1. Caching
```ts
// API response caching
import { cache } from 'react';

export const getPDFProperties = cache(async (file) => {
  // Cached for request duration
});
```

### 2. Code Splitting
- Automatic with Next.js
- PDF libraries lazy loaded
- UI components code split

### 3. Image Optimization
- Next.js Image component
- Automatic format selection
- Responsive images

### 4. Database Optimization
- Indexed queries
- Connection pooling
- Query optimization

---

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Load Testing
```bash
# Using k6
k6 run load-test.js

# Using Apache Bench
ab -n 1000 -c 100 http://localhost:3000/
```

---

## Scaling Guidelines

| Metric | Small | Medium | Large |
|--------|-------|--------|-------|
| Users | <100 | 100-1000 | 1000+ |
| Node Instances | 1 | 2-4 | 8+ |
| Memory | 512MB | 2GB | 8GB+ |
| Database | SQLite | PostgreSQL | PostgreSQL+ |
| Cache | Memory | Redis | Redis Cluster |
| CDN | Optional | Recommended | Required |

---

## Support & Contact

### Documentation
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Configuration Reference](toolforge/.deployment-config.json)

### Monitoring Tools
- [Health Check](health-check.py)
- [Monitoring Dashboard](production-monitoring-dashboard.py)
- [PM2 CLI](https://pm2.keymetrics.io/)

### Getting Help

1. Check logs: `pm2 logs`
2. Run health check: `python health-check.py`
3. Review troubleshooting guide above
4. Check GitHub Issues: [Link]
5. Contact support: [Email]

---

## Changelog

### Version 3.0 (Production Release)
✅ PDF text replacement with property matching
✅ Font size preservation
✅ Color conservation  
✅ Font type matching
✅ Comprehensive testing (24 tests)
✅ Production deployment package
✅ Monitoring & observability tools
✅ Security hardening

### Version 2.0
- Basic text replacement
- Form field detection

### Version 1.0
- Initial PDF editor

---

*Last Updated: 2024*
*Status: PRODUCTION READY*
