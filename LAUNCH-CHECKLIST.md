# 🎯 VEYRA - Production Launch Checklist

**Version:** 1.0.0  
**Date:** 2026-10-08  
**Target Domain:** `https://veyra.caelmont.in`

---

## PHASE 1: Pre-Launch Preparation ✅

### Cloudflare Configuration
- [ ] Domain `veyra.caelmont.in` added to Cloudflare DNS
- [ ] SSL/TLS mode set to "Full" or "Full (strict)"
- [ ] HTTPS only redirect enabled
- [ ] HTTP/2 and HTTP/3 protocols enabled
- [ ] Auto Minification (JS/CSS) enabled
- [ ] Brotli compression enabled

### Environment Variables (`.env.local`)
- [ ] `NEXT_PUBLIC_SITE_URL=https://veyra.caelmont.in`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` present and valid
- [ ] `DODO_PAYMENTS_API_KEY` obtained
- [ ] `DODO_PAYMENTS_WEBHOOK_KEY` obtained  
- [ ] `DODO_PAYMENTS_ENVIRONMENT="live_mode"`
- [ ] `DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM` set
- [ ] Rate limiting vars set (optional):
  - `RATE_LIMIT_ENABLED=false`
  - `RATE_LIMIT_MAX_REQUESTS=100`
  - `RATE_LIMIT_WINDOW_MS=60000`

### Supabase Setup
- [ ] Database migration 0025 (rate_limits) applied
- [ ] Orders table has required columns
- [ ] RLS policies enabled on sensitive tables
- [ ] Analytics visible in dashboard
- [ ] Connection pool usage <80% under test load

### Payment System (Dodo)
- [ ] Dodo merchant account KYC completed
- [ ] Test payment verified works
- [ ] Webhook URL configured in Dodo dashboard
- [ ] Webhook secret stored in Worker secrets
- [ ] Product created in Dodo dashboard
- [ ] Payout bank account verified

---

## PHASE 2: Deployment Tasks ⚡

### Run Deployment Script

```bash
cd C:\Users\abdul\Desktop\Projects\Veyra

# Option A: Git Bash (recommended)
chmod +x deploy-all.sh
./deploy-all.sh

# Option B: Manual commands
npm install --legacy-peer-deps
npm run build
npm run preview
wrangler login
wrangler kv namespace create NEXT_INC_CACHE_KV
wrangler secret put DODO_PAYMENTS_API_KEY "your_key_here"
wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY "your_webhook_secret"
wrangler deploy --minify --name veyra
```

### Verify Deployment Success
- [ ] Wrangler deploy completes without errors
- [ ] Site responds with HTTP 200 at `https://veyra.caelmont.in`
- [ ] Static assets cache headers present (`Cache-Control: public`)
- [ ] KV namespace bound correctly
- [ ] No runtime errors in `wrangler tail veyra` logs

---

## PHASE 3: Cloudflare Rate Limiting ⚠️ REQUIRED

**This step is CRITICAL - configure manually in dashboard:**

Go to: https://dash.cloudflare.com → Workers & Pages → veyra → Settings → Rate Limiting

### Add These Rules:

**Rule #1: API Protection**
- Name: `API_Route_Protection`
- Path: `/api/*`
- Limit: **100 requests per minute**
- Per: **IP address**
- Action: **Block** (return 429 status code)

**Rule #2: Homepage Protection**
- Name: `Homepage_Throttling`
- Path: `/*` (or specific: `/` OR `/shop` OR `/pricing`)
- Limit: **300 requests per minute**
- Per: **IP address**
- Action: **Block**

**Rule #3: Sign-up Bot Filter**
- Name: `Anti_Bot_Signup`
- Path: `/account/sign-up` OR `/api/subscribe`
- Limit: **5 requests per minute**
- Per: **IP address**
- Action: **Challenge** (Cloudflare Turnstile CAPTCHA)

**Rule #4: Checkout DDoS Protection**
- Name: `Checkout_DDoS_Protection`
- Path: `/api/checkout*` OR `/api/payment*`
- Limit: **30 requests per minute**
- Per: **IP address**
- Action: **Delay request by 5 seconds**

After adding each rule, click **"Deploy"** to activate it immediately.

---

## PHASE 4: Testing Checklist 🔍

### Smoke Tests (Run Immediately After Deploy)

#### Basic Functionality
- [ ] Navigate to homepage - loads in <2 seconds
- [ ] Product page renders pricing ($79 founding / $149 regular)
- [ ] "Buy Now" button visible and clickable
- [ ] Account sign-up page accessible
- [ ] Admin login page accessible (at `/admin/sign-in`)
- [ ] Legal pages (Privacy, Terms) render correctly

#### Authentication Flow
- [ ] Create test user account
- [ ] Login works with email/password
- [ ] Session persists after logout/login
- [ ] Password reset email received
- [ ] Admin role assignment works

#### Payment Flow (Test Mode First)
- [ ] Click "Buy Now" on product
- [ ] Redirected to Dodo checkout
- [ ] Complete test payment
- [ ] Return to site after payment
- [ ] Order recorded in Supabase orders table
- [ ] License activation email sent
- [ ] Download link functional in library

#### Security Verification
- [ ] Invalid license shows error (not active)
- [ ] Rate limiting kicks up after repeated attempts
- [ ] Admin-only routes return 401 for non-admins
- [ ] CORS headers present on API responses
- [ ] HTTPS enforced everywhere

### Performance Tests

#### Load Test (Optional but Recommended)
```bash
# Using Apache Bench (install via: npm install -g apache-bench)
ab -n 1000 -c 50 https://veyra.caelmont.in/
# Expected results:
# • Average response time: <200ms
# • Success rate: >99%
# • Failed requests: <10 (from network issues only)
```

#### CDN Cache Validation
```bash
curl -I https://veyra.caelmont.in/_next/static/chunks/main.js
# Should return: Cache-Control: public, max-age=31536000, immutable
```

#### API Rate Limit Test
```bash
# Generate 150 rapid requests to API endpoint
for i in {1..150}; do curl -s https://veyra.caelmont.in/api/claim & done | sort | uniq -c
# Should see: some 429 responses after ~100 requests
```

---

## PHASE 5: Monitoring Setup 📊

### Cloudflare Analytics Dashboard

Set up these monitors:
- [ ] Traffic spikes (>10K requests in 1 hour)
- [ ] Error rate >1% (watch 5xx status codes)
- [ ] Cache hit ratio <70% (indicates caching issues)
- [ ] Security events spike (potential attack)

Enable real-time metrics:
```bash
wrangler tail veyra --follow
```

### Supabase Monitoring

Check daily for first week:
- [ ] Database storage <400MB (stay under 500MB limit)
- [ ] Bandwidth used <1GB (well under 2GB free allowance)
- [ ] Active connections <80% of pool
- [ ] Query performance acceptable (no slow queries)

### Error Tracking

Create alert channels:
- [ ] Slack webhook for critical errors (optional)
- [ ] Email notifications for deployment failures
- [ ] Dashboard bookmark for quick access

---

## PHASE 6: Launch Communication 📣

### Internal Stakeholders
- [ ] Notify team that site is live
- [ ] Share monitoring dashboard links
- [ ] Document rollback procedure if needed

### Marketing/Social Media
- [ ] Prepare launch announcement tweet/post
- [ ] Draft blog post about opening acceptance
- [ ] Schedule email newsletter blast
- [ ] Update portfolio/case study pages

### Customer Support Readiness
- [ ] FAQ page covers common questions
- [ ] Contact form tested and working
- [ ] Response templates prepared for common issues
- [ ] Refund policy documented somewhere accessible

---

## PHASE 7: Post-Launch Day 1 Monitoring 📈

### Hourly Checks (First 6 Hours)
- [ ] Website responding normally (ping every hour)
- [ ] Zero critical errors in logs
- [ ] Rate limit hits <10 (should be mostly bots)
- [ ] Checkout flow working (test purchase every 2 hours)

### Metrics to Track
- Total visitors (aim for gradual growth, no viral spikes initially)
- Conversion rate (sign-ups → purchases)
- Average page load time (<2 seconds target)
- Error rate (<1% target)

### Immediate Actions If Issues Arise

**Scenario: High 429 errors from legitimate users**
→ Increase Cloudflare rate limits (e.g., 100→200 req/min)

**Scenario: Slow database queries**
→ Check Supabase connection pool; upgrade to Pro plan if needed

**Scenario: Static assets not caching**
→ Purge cache in Cloudflare dashboard (Caching > Purge Everything)

**Scenario: Payment webhooks not firing**
→ Verify Dodo webhook secret matches exactly
→ Check Dodo webhook logs in their dashboard

---

## PHASE 8: First Week Optimization 🚀

### Day 2-3: Fine-Tuning
- Adjust rate limit thresholds based on real traffic patterns
- Review which pages get most visits (optimize those for speed)
- Check conversion funnel for drop-off points

### Day 4-7: Scale Planning
- Monitor if approaching Supabase free tier limits
- Plan infrastructure upgrades if hitting 70% of capacity
- Consider enabling WAF rules for additional security

### Week 2+: Long-term Maintenance
- Monthly review of analytics and costs
- Quarterly dependency updates
- Annual security audit

---

## LAUNCH VERIFICATION

Before declaring the site fully launched, confirm:

- [ ] All Phase 1 items checked ✅
- [ ] All Phase 2 tasks completed ✅
- [ ] Cloudflare rate limits configured (Phase 3) ✅
- [ ] All smoke tests pass (Phase 4) ✅
- [ ] Monitoring dashboards active (Phase 5) ✅
- [ ] Team notified (Phase 6) ✅
- [ ] Day 1 monitoring successful (Phase 7) ✅

If ANY item is unchecked: **DO NOT DECLARE LAUNCH COMPLETE**

---

## EMERGENCY CONTACTS & PROCEDURES

### Critical Issues Quick Reference

| Issue | Impact | Fix | Command |
|-------|--------|-----|---------|
| Site down (500 errors) | All users blocked | Redeploy previous version | `git revert && npm run deploy` |
| DB connection exhausted | Checkout fails | Upgrade to Supabase Pro | supabase.com/dashboard |
| Payment broken | No revenue | Restore from Dodo test mode | dodopayments.com/dashboard |
| Rate limits blocking users | Legitimate blocked | Increase limits in dashboard | cloudflare.com/dash |
| Data loss suspected | Critical | Restore from backup | supabase.com/backups |

### Rollback Procedure

If something goes critically wrong during deployment:

1. **Immediate halt**: Stop deploying new changes
2. **Identify root cause**: Check `wrangler tail veyra` logs
3. **Quick fix**: Edit `.env.local` or config file causing issue
4. **Redeploy**: Run `npm run deploy` again
5. **Verify**: Confirm site responds correctly

### Escalation Contacts

- **Technical Issues**: Dev team internal channel
- **Payment Problems**: dodo-support@dodopayments.com
- **Cloudflare Issues**: support@cloudflare.com (requires Business plan)
- **Domain/DNS Issues**: your domain registrar's support

---

## SUCCESS METRICS

You know you're successfully launched when:

✅ Website uptime >99.5% over 7 days  
✅ Average page load time <2 seconds  
✅ Zero customer complaints about functionality  
✅ At least 5 test purchases completed successfully  
✅ Monitoring alerts configured and working  
✅ Team knows how to troubleshoot common issues  

---

**🎉 When all boxes are checked: YOU'RE READY TO GO LIVE!**

Next step: Announce to the world and track your growth!
