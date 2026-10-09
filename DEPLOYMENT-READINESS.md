# 🎯 Deployment Readiness Checklist

**Purpose**: Verify all prerequisites before running deployment  
**Version**: 1.0 | **Date**: 2026-10-08  
**Target**: Fresh production deployment of Veyra on Cloudflare Workers

---

## ✅ ACCOUNTS & ACCESS

### Cloudflare
- [ ] Cloudflare account created at https://dash.cloudflare.com
- [ ] Domain `veyra.caelmont.in` already added to Cloudflare DNS
- [ ] SSL/TLS mode configured (set to "Full" or "Full strict")
- [ ] Domain is proxied through Cloudflare (orange cloud icon enabled)
- [ ] No pending DNS propagation issues

### Supabase
- [ ] Supabase account active at supabase.com
- [ ] Project `otqucrqcefdychplbbtq` exists and is running
- [ ] Database migrations have been applied (especially migration 0025 rate_limits)
- [ ] RLS (Row Level Security) policies enabled where needed
- [ ] Service role key accessible (not exposed publicly)

### Dodo Payments
- [ ] Merchant account KYC approved at dodopayments.com
- [ ] API keys obtained from dashboard
- [ ] Product created for "Client Growth System"
- [ ] Product ID matches configuration (`pdt_0Np5Ph7FnG2PbOkPoQtdI`)
- [ ] Payout bank account verified and ready
- [ ] Test payment completes successfully in sandbox mode

### Email Delivery (Resend - optional but recommended)
- [ ] Resend.com account created
- [ ] Sending domain verified (`veyra.caelmont.in`)
- [ ] API key accessible
- [ ] First test email delivered successfully

---

## 🔧 LOCAL ENVIRONMENT PREPARATION

### Development Tools
- [ ] Node.js installed (version 18 or higher): `node -v`
- [ ] npm available: `npm -v`
- [ ] Git Bash OR PowerShell command line working
- [ ] VS Code or preferred code editor available

### Wrangler CLI Setup
```bash
# Check if wrangler is installed
where wrangler >nul 2>nul || echo NOT INSTALLED

# If not installed, run this:
npm install -g wrangler@latest

# Verify installation
wrangler --version
```
- [ ] Wrangler CLI installed globally
- [ ] Can login to Cloudflare: `wrangler login` (successful authentication)
- [ ] Logged-in identity confirmed via `wrangler whoami`

---

## 📝 CONFIGURATION FILES

### Environment Variables (.env.local)
The file must exist at project root with these values:

```bash
# Required fields (must be filled):
NEXT_PUBLIC_SITE_URL=https://veyra.caelmont.in
NEXT_PUBLIC_SUPABASE_URL=https://otqucrqcefdychplbbtq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_256-char_jwt_token_here>

DODO_PAYMENTS_API_KEY=dod_live_xxxxxxxx
DODO_PAYMENTS_WEBHOOK_KEY=whsec_xxxxxxxx
DODO_PAYMENTS_ENVIRONMENT="live_mode"
DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM="pdt_0Np5Ph7FnG2PbOkPoQtdI"

# Optional but recommended:
RESEND_API_KEY=re_xxxxxxxx
VEYRA_LICENCE_SIGNING_KEY=<your_secret_key>

# Rate limiting config:
RATE_LIMIT_ENABLED=false
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

Checklist:
- [ ] `.env.local` file exists (should be gitignored)
- [ ] All required secrets present and non-empty
- [ ] Values match your actual accounts/services
- [ ] File permissions restrict access (chmod 600 .env.local on Unix)

### Code Configuration
```bash
# These files should already be correct, verify them:
```
- [ ] `wrangler.jsonc` contains correct worker name: `"veyra"`
- [ ] `wrangler.jsonc` has KV namespace binding: `NEXT_INC_CACHE_KV`
- [ ] `wrangler.jsonc` route pattern: `veyra.caelmont.in`
- [ ] `package.json` has deploy scripts defined
- [ ] `.gitignore` includes `.env*`, `.next/`, `.open-next/`, etc.

---

## 🗂️ PROJECT STRUCTURE VALIDATION

Essential directories/files must exist:
```bash
ls -la
```
- [ ] `/src` directory exists with application code
- [ ] `/public` directory exists
- [ ] `/supabase` directory exists with migrations
- [ ] `/scripts` directory exists with deployment scripts
- [ ] `next.config.ts` present
- [ ] `tsconfig.json` present
- [ ] `package.json` present
- [ ] `wrangler.jsonc` present
- [ ] README files exist (README-QUICKSTART.md, etc.)

Critical source files check:
- [ ] `src/middleware.ts` contains rate limiting logic
- [ ] `src/lib/rate-limit.ts` exists
- [ ] `src/app/api/*` directories contain API routes
- [ ] `public/_headers` file configured for caching

---

## 🔐 SECURITY PREPARATION

### Secrets Management
Verify you can upload secrets securely:
```bash
# Test secret upload capability
wrangler secret put TEST_UPLOAD_MARKER "test_value"
# Then remove it:
wrangler secret delete TEST_UPLOAD_MARKER
```
- [ ] Can upload and delete test secrets successfully
- [ ] Understand that secrets are stored in Cloudflare, NOT in git

### Access Control
- [ ] Admin account credentials documented somewhere safe
- [ ] Service role keys secured (never committed to git!)
- [ ] API keys backed up offline (encrypted storage)

### Environment Separation
Understand environment modes:
- [ ] Test mode vs Live mode differences understood
- [ ] Plan to switch DODO_PAYMENTS_ENVIRONMENT only after testing
- [ ] Know how to rollback if something goes wrong

---

## 🚀 DEPLOYMENT LOGIC CHECK

Before deploying, confirm you understand:

### What Gets Deployed
- [ ] Next.js app → Compiled for Cloudflare Workers runtime
- [ ] Static assets → Uploaded to KV storage
- [ ] Middleware → Executes at edge network locations
- [ ] API routes → Function as Serverless endpoints

### Pre-deployment Steps You'll Do
- [ ] Run `setup-windows.bat` to validate local environment
- [ ] Edit `.env.local` with correct secrets
- [ ] Build application: `npm run build`
- [ ] Create KV namespace (if not exists)
- [ ] Upload ALL secrets to Cloudflare
- [ ] Configure Cloudflare Dashboard Rate Limits (4 rules)
- [ ] Deploy worker: `wrangler deploy`

### Post-deployment Actions You'll Do
- [ ] Test site health: `curl -I https://veyra.caelmont.in`
- [ ] Monitor logs: `wrangler tail veyra`
- [ ] Test payment flow in test mode first
- [ ] Wait 24 hours monitoring error rates
- [ ] Switch to live payments after successful tests
- [ ] Announce launch when metrics stabilize

---

## 🧪 TESTING READINESS

### Functional Tests Prepare
Create test accounts/data in advance:
- [ ] Test customer account created
- [ ] Test admin account with role=admin configured
- [ ] Test license activation process works end-to-end
- [ ] Test password reset flow functional

### Payment Testing Strategy
- [ ] Dodo test product ID identified
- [ ] Sandbox payment URL known
- [ ] Webhook verification steps documented
- [ ] Refund process tested once

### Load Testing Tools (Optional)
Have load testing tools ready if needed:
- [ ] Apache Bench: `npm install -g apache-bench`
- [ ] k6 tool available: `npm install -g k6`
- [ ] Or use online load testing services

---

## 📊 MONITORING SETUP

### Dashboards to Bookmark
Set up bookmarks NOW so they're ready post-deploy:
- [ ] Cloudflare Analytics: https://dash.cloudflare.com/analytics
- [ ] Worker Logs: Workers & Pages → veyra → Logs
- [ ] Supabase Dashboard: supabase.com/dashboard
- [ ] Dodo Payments Dashboard: dodopayments.com/dashboard

### Alerting Preferences
Decide how you want to be notified of issues:
- [ ] Email notifications enabled for critical errors
- [ ] Slack webhook configured (optional)
- [ ] Mobile device checked regularly during launch week

---

## 🛡️ ROLLBACK PREPARATION

If deployment fails, you need a plan:
- [ ] Git repository cloned locally with recent commit saved
- [ ] Know how to revert changes: `git checkout <previous-commit>`
- [ ] Have previous good deployment version recorded
- [ ] Can redeploy quickly from backup

---

## ⏱️ TIME COMMITMENT CHECKLIST

Allocate sufficient time for deployment:
- [ ] **Setup phase**: 30 minutes (verify environment)
- [ ] **Configuration phase**: 15 minutes (fill secrets, enable features)
- [ ] **Deployment phase**: 20 minutes (run scripts, monitor progress)
- [ ] **Testing phase**: 30 minutes (functional verification)
- [ ] **Monitoring phase**: Ongoing (first 24-48 hours daily checks)

**Total initial investment**: ~2 hours minimum  
**Recommended**: Block off morning or afternoon uninterrupted

---

## 📋 FINAL VERIFICATION

Before running `./deploy-all.sh` or `wrangler deploy`, ensure:

### Green Lights Only ✅
- [ ] All prerequisite sections marked complete above
- [ ] Account access verified (logged into all services)
- [ ] Environment variables correct and saved
- [ ] Wrangler CLI authenticated successfully
- [ ] Can read/write to Cloudflare resources
- [ ] Understand what will happen during deployment
- [ ] Prepared for potential issues and have rollback plan
- [ ] Set aside dedicated time block (no interruptions)

### Yellow Lights = PAUSE ❗
- [ ] Any unanswered question about deployment process
- [ ] Missing account access or unclear permissions
- [ ] Environment variables incomplete or uncertain
- [ ] Confused about any step

If you have yellow lights: **STOP and research/clear before proceeding!**

---

## 🎯 READY TO DEPLOY?

If you have **all green lights**, you're ready! 

Execute deployment now using one of these methods:

**Automated (recommended):**
```bash
chmod +x deploy-all.sh && ./deploy-all.sh
```

**Manual control:**
```bash
cd C:\Users\abdul\Desktop\Projects\Veyra
npm run build
npm run preview
wrangler deploy --minify --name veyra
```

---

## 🆘 NEED HELP DURING DEPLOYMENT?

### Common Issues and Quick Fixes

| Issue | Solution |
|-------|----------|
| "Permission denied" | Check Cloudflare API token permissions |
| "Namespace not found" | Run: `wrangler kv namespace create NEXT_INC_CACHE_KV` |
| "Secret upload failed" | Ensure value isn't too long (<32KB per secret) |
| "Build timeout" | Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"` |
| "Worker deployment stuck" | Cancel current deploy, wait 2 min, retry |

### Support Resources
- Documentation: See `README-DEPLOYMENT.md` for detailed help
- Logs: Always check `wrangler tail veyra` for error details
- Community: Cloudflare Developers Forum: developers.cloudflare.com

---

**Deployment Date Planned**: _______________  
**Deployment Time Slot**: __ AM / PM  
**Backup Deployer Available**: Yes / No  
**Rollback Person Identified**: Yes / No  

---

**When ALL boxes are checked = GO FOR LAUNCH!** 🚀

**Status**: _Pending execution_  
**Next Action**: Run deployment script  
**Expected Completion**: Within 1 hour
