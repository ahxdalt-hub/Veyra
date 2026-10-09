# 🚀 Veyra - Quick Start Guide

**TL;DR**: Deploy your site to Cloudflare Workers in 5 minutes with automated scripts.

---

## 📦 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Node.js 18+** installed (https://nodejs.org/)
- [ ] **Git Bash** or **PowerShell** available
- [ ] **Cloudflare account** (free at https://dash.cloudflare.com)
- [ ] **Domain** `veyra.caelmont.in` added to Cloudflare DNS
- [ ] **Supabase project** created (otqucrqcefdychplbbtq)
- [ ] **Dodo Payments** merchant account KYC completed

---

## ⚡ Fast Track (Automated)

### Windows / Git Bash Users

```bash
cd C:\Users\abdul\Desktop\Projects\Veyra

# Step 1: Run setup script
setup-windows.bat

# Step 2: Edit environment file
notepad .env.local   # Fill in your secrets
# OR use VS Code:
code .env.local

# Step 3: Deploy
chmod +x deploy-all.sh    # Only if using Git Bash
./deploy-all.sh           # One command deploys everything!
```

### PowerShell Users

```powershell
cd C:\Users\abdul\Desktop\Projects\Veyra

# Install Wrangler globally (if not already)
npm install -g wrangler@latest

# Login to Cloudflare
wrangler login

# Create KV namespace (first time only)
wrangler kv namespace create NEXT_INC_CACHE_KV

# Upload secrets from .env.local
wrangler secret put DODO_PAYMENTS_API_KEY
wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Build and deploy
npm run build
npm run preview
wrangler deploy --minify --name veyra
```

---

## 🔧 Manual Steps (If Automation Fails)

If something goes wrong, follow these steps manually:

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Build Application
```bash
npm run build
```

### 3. Authenticate with Cloudflare
```bash
wrangler login
```

### 4. Create KV Storage
```bash
wrangler kv namespace create NEXT_INC_CACHE_KV
# Save the output ID (you'll need it later)
```

### 5. Upload Secrets
Open `.env.local`, copy each secret value, then:
```bash
wrangler secret put DODO_PAYMENTS_API_KEY
(paste your key when prompted)

wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
(paste your webhook secret)

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
(paste your service role key)
```

### 6. Deploy Worker
```bash
wrangler deploy --minify --name veyra
```

---

## ⚠️ CRITICAL: Configure Cloudflare Rate Limits

**This step is MANDATORY before launch!**

1. Go to: https://dash.cloudflare.com
2. Select domain: `veyra.caelmont.in`
3. Click: **Workers & Pages** → **veyra** worker
4. Scroll down to **"Rate Limiting"** section
5. Click **"Add rule"** and configure these **4 rules**:

| Rule Name | Path | Limit | Per | Action |
|-----------|------|-------|-----|--------|
| API Protection | `/api/*` | 100/min | IP | Block |
| Homepage Protection | `/*` | 300/min | IP | Block |
| Anti-Bot Sign-up | `/account/sign-up` | 5/min | IP | Challenge |
| Checkout DDoS | `/api/checkout*` | 30/min | IP | Delay (5s) |

After adding each rule, click **"Deploy"** immediately.

**Why this is critical**: Without rate limits, bots can overwhelm your site during traffic spikes. This takes 5 minutes but prevents disasters.

---

## ✅ Verify Deployment

Run these checks after deployment:

### Health Check
```bash
curl -I https://veyra.caelmont.in
```
Expected: `HTTP/1.1 200 OK`

### Cache Header Check
```bash
curl -I https://veyra.caelmont.in/_next/static/chunks/main.js
```
Expected: `Cache-Control: public, max-age=31536000, immutable`

### View Live Logs
```bash
wrangler tail veyra
```
Monitor for any errors during initial traffic

---

## 🎯 Test Your Site

Visit these URLs and verify they work:

- [ ] https://veyra.caelmont.in - Homepage loads
- [ ] https://veyra.caelmont.in/shop - Product page shows pricing
- [ ] https://veyra.caelmont.in/account/sign-up - Sign-up form accessible
- [ ] https://veyra.caelmont.in/admin/sign-in - Admin login works
- [ ] Try creating test user account
- [ ] Complete a test payment via Dodo sandbox mode

---

## 📊 Monitor First 24 Hours

Bookmark these dashboards:

- **Cloudflare Analytics**: https://dash.cloudflare.com/analytics
- **Worker Logs**: `wrangler tail veyra` in terminal
- **Supabase Dashboard**: supabase.com/dashboard/projects
- **Dodo Payments**: dodopayments.com/dashboard

Watch for:
- 429 status codes (should be <0.1% of traffic)
- 5xx errors (indicates application issues)
- Slow response times (>2 seconds for HTML pages)

---

## 🆘 Troubleshooting Common Issues

### Issue: "Site returns 500 error"
**Check**: Environment variables configured? KV namespace exists?  
**Fix**: `wrangler env get` to verify bindings

### Issue: "Static assets not caching"
**Check**: Did Cloudflare propagate changes?  
**Fix**: Wait 5-10 minutes, then purge cache: Dashboard > Caching > Purge Everything

### Issue: "Rate limiting blocks legitimate users"
**Check**: Are real users getting blocked?  
**Fix**: Increase Cloudflare rate limits (e.g., 100→200 req/min)

### Issue: "Database connection pool exhausted"
**Check**: Supabase connection count hitting limit?  
**Fix**: Upgrade to Supabase Pro plan ($25/mo)

---

## 📚 Full Documentation

For complete details, read these files in order:

1. **LAUNCH-CHECKLIST.md** → Must-read before going live
2. **DEPLOYMENT-SUMMARY.md** → Architecture overview
3. **README-DEPLOYMENT.md** → Detailed deployment guide
4. **CLOUDFLARE_RATE_LIMITING.md** → Rate limiting configuration

---

## 🎉 You're Live!

Once all tests pass:

✅ Announce on social media  
✅ Share with beta testers  
✅ Start tracking analytics  
✅ Monitor logs daily  

**Your site is now protected by:**
- Cloudflare edge network (global CDN)
- Multi-layer rate limiting (prevents abuse)
- Automatic scaling (handles traffic spikes)
- Secure payment processing (Dodo Payments)

---

## Need Help?

- **Technical Support**: Review troubleshooting sections in README-DEPLOYMENT.md
- **Payment Issues**: support@dodopayments.com
- **Cloudflare Problems**: status.cloudflare.com
- **Documentation Questions**: Re-read DEPLOYMENT-SUMMARY.md

**Deployment Date**: 2026-10-08  
**Status**: Production Ready ✅
