# ToolsForge PDF Editor - Deployment Guide

## Quick Start Deployment

### 1. Prepare Server
```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application directory
sudo mkdir -p /opt/toolforge
cd /opt/toolforge
```

### 2. Download Application
```bash
# Clone or copy application files
git clone <your-repo> .
# OR
cp -r /path/to/toolforge/* .
```

### 3. Install Dependencies
```bash
cd toolforge
npm install
```

### 4. Configure Environment
```bash
cp .env.production.template .env.production
# Edit .env.production with your settings
vim .env.production
```

### 5. Build Application
```bash
npm run build
```

### 6. Start Application
```bash
# Option 1: Direct (for testing)
npm start

# Option 2: Using PM2 (recommended for production)
npm install -g pm2
pm2 start npm --name "toolforge" -- start
pm2 startup
pm2 save
```

### 7. Verify Deployment
```bash
# Run health check
python health-check.py

# Or test manually
curl http://localhost:3000/
curl http://localhost:3000/tools/pdf-editor
```

## Features Deployed

✓ PDF text replacement with property matching
✓ Font size preservation
✓ Font type matching
✓ Text color conservation
✓ Input validation
✓ Error handling
✓ Performance optimized

## Performance Configuration

### For Small Deployments (< 100 users)
- Node processes: 1
- Memory: 512MB
- Build: Standard

### For Medium Deployments (100-1000 users)
- Node processes: 2-4 (use PM2 cluster)
- Memory: 2GB
- Build: Optimized
- CDN: Recommended

### For Large Deployments (> 1000 users)
- Load balancer: Required
- Node processes: 8+
- Memory: 8GB+
- Database: Separate server
- CDN: Required
- Monitoring: Essential

## Monitoring Setup

### Application Monitoring
```bash
pm2 monit  # Monitor running processes
pm2 logs   # View application logs
```

### System Monitoring
```bash
# CPU and Memory
top
# Disk usage
df -h
# Network
netstat -tuln
```

## Troubleshooting

### Issue: "Cannot find module"
- Solution: Run `npm install`

### Issue: API endpoint returns 404
- Solution: Check API routes are built, restart app

### Issue: PDF processing is slow
- Solution: Check server resources, increase memory

### Issue: Text replacement not working
- Solution: Check Python backend is running, verify logs

## Rollback Procedure

If issues occur:

1. Stop application:
   ```bash
   pm2 stop toolforge
   # Or: npm stop
   ```

2. Restore previous version:
   ```bash
   git revert HEAD
   # Or: restore from backup
   ```

3. Rebuild and restart:
   ```bash
   npm install
   npm run build
   pm2 restart toolforge
   ```

4. Verify health:
   ```bash
   python health-check.py
   ```

## Support Resources

- Application Logs: `/var/log/toolforge/app.log`
- Error Logs: `/var/log/toolforge/error.log` (if configured)
- Health Check: `python health-check.py`
- Status Check: `pm2 status`

## Next Steps After Deployment

1. Monitor application for 24 hours
2. Gather performance metrics
3. Configure backups
4. Set up monitoring alerts
5. Plan optional enhancements
6. Document any customizations
