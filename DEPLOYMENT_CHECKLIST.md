# Pre-Deployment Checklist

## Pre-Deployment
- [ ] Review all changes one final time
- [ ] Confirm all tests passing locally (24/24)
- [ ] Verify build success (npm run build)
- [ ] Check deployment environment setup
- [ ] Backup current production (if updating)
- [ ] Prepare rollback plan

## Deployment Steps
- [ ] Copy .env.production.template to .env.production
- [ ] Fill in all required environment variables
- [ ] Run: npm install (in production)
- [ ] Run: npm run build (production build)
- [ ] Start application: npm start
- [ ] Verify API endpoint: /api/pdf/edit
- [ ] Test PDF editor functionality
- [ ] Check logs for errors

## Post-Deployment
- [ ] Monitor error logs for 1 hour
- [ ] Monitor performance metrics
- [ ] Test text replacement with sample PDFs
- [ ] Verify property matching working
- [ ] Check API response times
- [ ] Confirm no database issues (if applicable)
- [ ] Send notification to stakeholders

## Verification
- [ ] Application running on port 3000 (default)
- [ ] API endpoints accessible
- [ ] PDF processing working
- [ ] Canvas rendering functional
- [ ] Download functionality working
- [ ] No console errors

## Rollback Plan (if issues occur)
1. Stop application: npm stop (or kill process)
2. Restore previous version from backup
3. run: npm install
4. Run: npm run build
5. Restart application
6. Verify rollback successful
7. Investigate issue and redeploy

## Support
For issues, check:
- /var/log/toolforge/app.log (application log)
- Browser console (frontend errors)
- Check Python backend output (if running)
