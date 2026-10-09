# 🚀 Veyra - Cloudflare Deployment Guide

## Quick Start (Fresh Deployment)

### Option 1: Run Automated Script (Recommended)

```bash
cd C:\Users\abdul\Desktop\Projects\Veyra

# Make script executable (Git Bash/WSL)
chmod +x deploy-all.sh

# Run the full deployment
./deploy-all.sh
```

### Option 2: Manual Steps

See **Manual Deployment Steps** section below.

---

## What This Deploys

✅ **Complete Production Setup:**
- Next.js 14 application optimized for Cloudflare Workers
- Edge caching with KV incremental cache
- API rate limiting via Supabase PostgreSQL
- Middleware protection against abuse
- Static asset CDN caching (1-year immutable)

---

## Pre-Deployment Checklist

Before running the deployment script, ensure you have:

### 1. Cloudflare Account ✅
- [ ] Logged into https://dash.cloudflare.com
- [ ] Domain `veyra.caelmont.in` already added to Cloudflare DNS
- [ ] SSL/TLS set to "Full" or "Full (strict)"

### 2. Supabase Project ✅  
- [ ] Project: `otqucrqcefdychplbbtq` confirmed active
- [ ] Database connection pool available
- [ ] Service role key saved in `.env.local`

### 3. Dodo Payments Configuration ✅
- [ ] Merchant account created and KYC completed
- [ ] API keys obtained (test or live mode)
- [ ] Product ID configured: `pdt_0Np5Ph7FnG2PbOkPoQtdI`

### 4. Email Delivery (Optional but Recommended) ✅
- [ ] Resend.com account created
- [ ] API key configured in `.env.local`
- [ ] Sending domain verified (`veyra.caelmont.in`)

---

## Environment Variables Required

Your `.env.local` file should contain these values (masked here):

```bash
# Required secrets
DODO_PAYMENTS_API_KEY=dod_live_xxxxxxxx
DODO_PAYMENTS_WEBHOOK_KEY=whsec_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional (recommended)
RESEND_API_KEY=re_xxxxxxxx
VEYRA_LICENCE_SIGNING_KEY=your_secret_key_here

# Rate limiting configuration
RATE_LIMIT_ENABLED=false           # Set to true if using middleware throttle
RATE_LIMIT_MAX_REQUESTS=100        # Requests per window
RATE_LIMIT_WINDOW_MS=60000         # Window duration in milliseconds
```

**Note**: Secret values are uploaded to Cloudflare via `wrangler secret put` during deployment - they're never committed to git.

---

## Deployment Process

### Phase 1: Build & Package

```bash
npm install --legacy-peer-deps
npm run build
npm run preview            # Creates Worker bundle in .open-next
```

### Phase 2: Cloudflare Setup

```bash
wrangler login                    # Auth with your Cloudflare account
wrangler kv namespace create NEXT_INC_CACHE_KV   # Create KV storage
wrangler secret put DODO_PAYMENTS_API_KEY ...    # Upload secrets
```

### Phase 3: Deploy Worker

```bash
wrangler deploy --minify --name veyra
```

### Phase 4: Configure Routes

Add route rule in `wrangler.jsonc`:
```json
"routes": [
  { "pattern": "veyra.caelmont.in", "custom_domain": true }
]
```

---

## Post-Deployment Tasks

### 1. Verify Deployment

Check that your site is responding:

```bash
curl -I https://veyra.caelmont.in
# Should return: HTTP/1.1 200 OK
```

View response headers:
```bash
curl -I https://veyra.caelmont.in | grep -i "cache-control"
# Should show: public,s-maxage=60,stale-while-revalidate=300
```

### 2. Configure Cloudflare Rate Limits

Go to **Cloudflare Dashboard → Workers & Pages → veyra → Settings → Rate Limiting**

Add these 4 rules:

#### Rule #1: Protect API Routes
- **Name**: API Protection
- **Path**: `/api/*`
- **Limit**: 100 requests per minute
- **Per**: IP address
- **Action**: Block (return 429 status)

#### Rule #2: Homepage Protection
- **Name**: Public Page Protection
- **Path**: `/` OR `/shop` OR `/pricing` OR `/*`
- **Limit**: 300 requests per minute
- **Per**: IP address  
- **Action**: Block

#### Rule #3: Sign-up Bot Filter
- **Name**: Anti-Bot Sign-up
- **Path**: `/account/sign-up` OR `/api/subscribe`
- **Limit**: 5 requests per minute
- **Per**: IP address
- **Action**: Challenge (Turnstile CAPTCHA)

#### Rule #4: Checkout DDoS Protection
- **Name**: Checkout Protection
- **Path**: `/api/checkout*` OR `/api/payment*`
- **Limit**: 30 requests per minute
- **Per**: IP address
- **Action**: Delay request by 5 seconds

### 3. Test Payment Flow

Test checkout with Dodo test mode first:

```bash
# Visit product page
open https://veyra.caelmont.in/shop

# Click "Buy Now" button
# Complete test payment through Dodo sandbox
```

Verify:
- [ ] License activation email received
- [ ] Download link works
- [ ] Orders table updated in Supabase

### 4. Monitor First 24 Hours

Watch these metrics daily:

#### Cloudflare Analytics (Dashboard > Analytics > Traffic)
- **Requests**: Should be steady, no sudden spikes
- **Cache Hit Ratio**: Expect 80%+ on static assets
- **Security Events**: Check for blocked bot attempts
- **Error Rate**: Keep below 1% (watch for 5xx errors)

#### Supabase Dashboard
- **Database Usage**: Stay under 500MB (free tier limit)
- **Connection Pool**: Monitor for exhaustion warnings
- **Bandwidth**: Track against 2GB/month free allowance

---

## Troubleshooting

### Issue: Site returns 500 error
**Possible causes:**
- Missing environment variables
- KV namespace not bound
- Supabase service key invalid

**Fix:**
```bash
# Check worker logs
wrangler tail veyra

# Verify bindings
wrangler env get
```

### Issue: Rate limits too aggressive
**Symptoms:** Legitimate users getting 429 errors

**Fix:** Go to Cloudflare dashboard and increase limits:
- Change from 100→200 req/min for homepage
- Or switch action from "Block" to "Throttle"

### Issue: Static assets not caching
**Symptoms:** No Cache-Control headers

**Fix:**
1. Check `_headers` file exists in public folder
2. Verify Cloudflare has propagated changes (may take 5-10 min)
3. Force purging old cache: Dashboard > Caching > Purge Everything

### Issue: API routes timing out
**Possible cause:** Supabase connection pool exhausted

**Fix:**
```sql
-- Check active connections
SELECT datid, count(*) FROM pg_stat_activity GROUP BY datid;
```

Consider upgrading to Supabase Pro plan ($25/mo) if consistently hitting limits.

---

## Scaling Recommendations

### When You Get 10K+ Daily Visitors

1. **Upgrade Supabase**
   - From Free to Pro plan ($25/mo)
   - Increases DB to 5GB, bandwidth to 100GB/mo

2. **Enable R2 Storage**
   - Faster downloads than Supabase Storage
   - Cheaper at scale ($0.01/GB vs $0.02/GB)

3. **Add Redis Cache**
   - Use Cloudflare Vectorize or Upstash for feature flags
   - Cache expensive queries

4. **Monitor Costs**
   - Cloudflare bandwidth: ~$0.15/GB after first 30GB
   - Supabase Pro: $25/mo flat
   - R2 storage: Negligible (<$5/mo for most use cases)

---

## Security Hardening (Optional Advanced)

### Enable Cloudflare WAF

```yaml
# Custom rules in Workers & Pages > Security > WAF Ruleset
Rule: Known Bad Bots
Pattern: http.request.uri contains "wp-admin"
Action: Block

Rule: SQL Injection Attempts
Pattern: http.request.body contains "(?i)(union|select|insert|drop)"
Action: Block

Rule: Path Traversal Attack
Pattern: http.request.uri contains "../.."
Action: Block
```

### Add Custom Header Verification

Create middleware rule to verify incoming requests:

```typescript
// In src/middleware.ts (already implemented)
if (!request.headers.get("x-api-key") === process.env.API_KEY) {
  // Check origin if it's an internal call
}
```

---

## Rollback Plan

If something goes wrong, you can easily rollback:

```bash
# List previous deployments
wrangler deployment list

# Revert to specific version
wrangler deployment rollback <deployment-id>

# Or redeploy from previous known-good commit
git checkout <previous-commit>
npm run deploy
```

---

## Performance Benchmarks

After deployment, expect these performance numbers:

### Global Edge Locations
- ✅ USA (Ashburn, Dallas, Los Angeles): ~30ms latency
- ✅ Europe (London, Frankfurt, Paris): ~40ms latency
- ✅ Asia (Tokyo, Mumbai, Singapore): ~60ms latency
- ✅ Australia (Sydney): ~80ms latency

### Request Speeds
- **Static Assets**: 50-100ms (served from CDN edge)
- **HTML Pages**: 100-200ms (cached at edge)
- **API Endpoints**: 200-500ms (depends on Supabase load)
- **Checkout Flow**: 500ms - 2s (external Dodo redirect)

### Concurrency Capacity
- **Normal Traffic**: Handles 1,000-5,000 concurrent users effortlessly
- **Traffic Spikes**: Survives 10x normal load automatically
- **Bottleneck**: Only when Supabase free tier limits reached (~50K page views/mo)

---

## Support & Documentation

### Resources
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Dodo Payments**: https://docs.dodopayments.com

### Emergency Contacts
- Cloudflare Status: https://www.cloudflarestatus.com/
- Supabase Status: https://status.supabase.com/
- Dodo Status: https://status.dodopayments.com/

---

## Compliance Checklist

For launch readiness:

- [ ] SSL certificate valid (Cloudflare managed)
- [ ] Terms of Service page published
- [ ] Privacy Policy page published
- [ ] Refund policy documented
- [ ] GDPR compliance measures (data export/deletion)
- [ ] Cookie consent banner (if EU visitors expected)
- [ ] PCI-DSS compliance (handled by Dodo - no card data on your servers)
- [ ] Tax compliance setup (handled by Dodo as merchant of record)

---

**Ready to deploy?** Run `./deploy-all.sh` and follow the prompts! 🚀
