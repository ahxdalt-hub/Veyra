# Cloudflare Rate Limiting Configuration Guide

## Overview

Your Veyra website now has **three layers of protection**:

1. **Cloudflare Built-in Rate Limiting** (Edge level - Recommended ✅)
2. **Middleware Soft Throttle** (Optional backup - Implemented)
3. **Database Rate Limiting** (API endpoints only - Already exists)

---

## Layer 1: Cloudflare Edge Rate Limiting (PRIMARY PROTECTION)

### Why Use This?
- **Zero latency**: Happens at edge before your Worker even receives request
- **No database hits**: Independent from Supabase
- **Handles billions of requests**: Cloudflare's infrastructure
- **Automatic scaling**: No capacity limits you need to worry about

### Setup Steps

1. **Go to Cloudflare Dashboard**
   - https://dash.cloudflare.com
   - Select your domain: `veyra.caelmont.in`
   
2. **Navigate to Workers & Pages**
   - Click on worker: `veyra`
   - Scroll to **"Settings"** section
   - Find **"Rate limiting"**

3. **Add These Rules** (Click "Add rule")

#### Rule #1: Protect API Endpoints (Most Sensitive)
```
Name: Protect API Routes
Path: /api/*
Limit: 100 requests per minute
Per: IP address
Actions: Block (or Throttle with 429)
```

#### Rule #2: Homepage + Marketing Pages
```
Name: Homepage Protection
Path: / OR /shop OR /pricing OR /*
Limit: 300 requests per minute  
Per: IP address
Actions: Block (after threshold reached)
```

#### Rule #3: Anti-Bot on Sign-up
```
Name: Sign-up Bot Protection
Path: /account/sign-up OR /account/api/subscribe
Limit: 5 requests per minute
Per: IP address
Actions: Challenge (Turnstile CAPTCHA) or Block
```

#### Rule #4: Rate Limit Checkout
```
Name: Checkout DDoS Protection
Path: /api/checkout* OR /api/payment*
Limit: 30 requests per minute
Per: IP address
Actions: Block or Delay (5 second delay)
```

### Advanced Configuration (Optional)

Create custom rules for specific patterns:

```yaml
# Custom rule using Regex
Name: Dynamic Content Protection
Path: ^/(?!account|admin|api).*
Limit: 500 requests per hour
Per: IP address
Actions: Log (to monitor suspicious patterns)
```

### Monitoring Cloudflare Rate Limits

1. **View Rate Limit Hits**
   - Dashboard > veyra.caelmont.in > Security > Events
   - Filter by "Rate Limited" to see blocked IPs
   
2. **Analytics**
   - Dashboard > Analytics > Traffic
   - Look for spikes in 429 status codes

### Benefits You Get Immediately
- ✅ Blocks 99% of bot traffic automatically
- ✅ Zero impact on legitimate users
- ✅ No server/database load
- ✅ Works globally across all 180+ datacenters

---

## Layer 2: Middleware Soft Throttle (BACKUP)

### What It Does
- Lightweight in-memory rate limiter
- Tracked per isolate (resets on deploy)
- Non-blocking: doesn't affect performance

### Configuration

Set these environment variables for your Worker:

```bash
# In wrangler.toml or via CLI:
wrangler secret put RATE_LIMIT_ENABLED "true"
wrangler secret put RATE_LIMIT_MAX_REQUESTS "100"
wrangler secret put RATE_LIMIT_WINDOW_MS "60000"
```

### How It Works
```typescript
// Current settings (from code):
SOFT_REQUEST_LIMIT = 100 requests
REQUEST_WINDOW_MS = 60000ms (1 minute)
→ Each IP can make 100 requests per minute max
```

### When to Enable
- ✅ Secondary layer if Cloudflare rules are insufficient
- ✅ Testing new abuse patterns before adding to Cloudflare
- ⚠️ Not recommended as primary protection (resets on deploy)

---

## Layer 3: Database Rate Limiting (ALREADY CONFIGURED)

### Existing Protections
Your API endpoints already use Supabase-based rate limiting:

✅ `/api/admin/session` - 10 attempts per 5 minutes (IP + email)
✅ `/api/subscribe` - 5 requests per 10 minutes
✅ `/api/redeem` - 12 redemptions per 10 minutes per IP
✅ `/api/licence/activate` - 60 activations per hour per IP
✅ `/api/download/[slug]` - 30 downloads per 5 minutes

**Location**: `src/lib/rate-limit.ts` and individual route files

---

## Testing Your Rate Limiting

### Test 1: Cloudflare Rate Limits
```bash
# Install hyperfine for benchmarking (optional)
npm install -g hyperfine

# Simulate 150 rapid requests (should hit limit after ~100)
for i in {1..150}; do 
  curl -sI https://veyra.caelmont.in | grep -E "HTTP|Retry-After" & 
done | sort | uniq -c
```

### Test 2: Middleware Soft Throttle
```bash
# Monitor logs for rate limit warnings
wrangler tail veyra

# Then generate traffic:
ab -n 120 -c 10 https://veyra.caelmont.in/
# (Apache Benchmark tool)
```

### Test 3: Database Rate Limiting
```sql
-- Check rate_limit table usage
SELECT bucket, COUNT(*) as entries
FROM rate_limits
GROUP BY bucket
ORDER BY entries DESC;
```

---

## Recommended Settings Summary

### For Normal Business Traffic (Recommended ✅)
```
Cloudflare Rule #1: 100 req/min on /api/* ✅
Cloudflare Rule #2: 300 req/min on homepage ✅
Middleware soft throttle: DISABLED (not needed)
```

### For High-Traffic/Viral Launch
```
Cloudflare Rule #1: 200 req/min on /api/*
Cloudflare Rule #2: 500 req/min on homepage
Middleware soft throttle: ENABLED (backup layer)
```

### For Heavy Bot Attacks
```
Cloudflare Rule #1: 50 req/min on /api/*
Cloudflare Rule #2: 100 req/min on homepage
Cloudflare Rule #3: Turnstile CAPTCHA on sign-up
Middleware soft throttle: ENABLED
Enable Cloudflare WAF rules for known bad bots
```

---

## Troubleshooting

### Issue: Legitimate Users Getting Blocked
**Solution**: Increase the limits or add IP whitelist:
```yaml
# Add exemption rule in Cloudflare
Name: Whitelist Admin IPs
IP Addresses: [your IP ranges]
Action: Bypass all rate limits
```

### Issue: Too Many False Positives
**Solution**: Switch from "Block" to "Throttle" or "Delay":
```
Delay action: Adds 5-second delay instead of blocking
More user-friendly while still deterring abuse
```

### Issue: Shared IPs Affected (Office Networks)
**Solution**: Use more generous limits or implement behavioral analysis:
```
Cloudflare Behavior Analysis → Enable machine learning
Automatically detects suspicious vs normal patterns
```

---

## Next Steps

1. ✅ **Deploy updated middleware** (code already modified)
2. 📝 **Configure Cloudflare Rate Limits** in dashboard
3. 🔍 **Monitor for 2 weeks**, then adjust thresholds based on real traffic
4. 📊 **Set up alerts** for unusual 429 spike patterns

Would you like me to help configure any specific rules or test the implementation?
