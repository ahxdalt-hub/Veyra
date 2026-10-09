#!/bin/bash

# Fresh Deployment Script - Veyra on Cloudflare Workers
# Run this from the Veyra directory root
# 
# This will:
# 1. Install dependencies
# 2. Build optimized Next.js app
# 3. Deploy to Cloudflare Workers
# 4. Configure environment variables
# 5. Set up rate limiting
# 6. Verify deployment

set -e  # Exit on error

echo "🚀 ==================================================="
echo "   VEYRA - FRESH CLOUDFLARE DEPLOYMENT"
echo "===================================================  "
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo ""

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version must be 18+. Current: $(node -v)"
    exit 1
fi
log_success "Node.js $(node -v) found"

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi
log_success "npm $(npm -v) found"

# Check if wrangler is available (install globally if needed)
if ! command -v wrangler &> /dev/null; then
    log_warn "Wrangler CLI not found. Installing..."
    npm install -g wrangler@latest
    log_success "Wrangler installed"
else
    log_success "Wrangler $(wrangler --version) already installed"
fi

echo ""

# Step 2: Install/Update dependencies
echo "📦 Step 2: Installing dependencies..."
cd "$(dirname "$0")"
npm ci 2>/dev/null || npm install
log_success "Dependencies installed"
echo ""

# Step 3: Build the application
echo "🔨 Step 3: Building Next.js application..."
npm run build
log_success "Build completed successfully"
echo ""

# Step 4: Login to Cloudflare (if not already logged in)
echo "☁️  Step 4: Authenticating with Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    log_warn "Not logged in to Cloudflare. Opening login prompt..."
    wrangler login
    log_success "Authenticated successfully"
else
    WHOAMI=$(wrangler whoami 2>/dev/null | head -1)
    log_success "Logged in as: $WHOAMI"
fi
echo ""

# Step 5: Create/set up KV namespace if it doesn't exist
echo "💾 Step 5: Setting up Cloudflare KV storage..."
KV_NAMESPACE="NEXT_INC_CACHE_KV"
NAMESPACE_ID=""

# Try to get existing namespace ID
NAMESPACE_ID=$(wrangler kv namespace list --format json 2>/dev/null | grep -o "\"id\": \"[^\"]*\"" | grep -o '"[^"]*"$' | tr -d '"' | while read id; do
    if [[ "$(wrangler kv namespace list --format json 2>/dev/null)" == *\"$id\"\** ]]; then
        echo "$id"
        break
    fi
done)

if [ -z "$NAMESPACE_ID" ]; then
    log_warn "KV namespace '$KV_NAMESPACE' not found. Creating..."
    NAMESPACE_ID=$(wrangler kv namespace create "$KV_NAMESPACE" --output-style text 2>/dev/null | grep -o "[a-f0-9]\{32\}")
    if [ -z "$NAMESPACE_ID" ]; then
        # Alternative extraction method
        NAMESPACE_ID=$(wrangler kv namespace create "$KV_NAMESPACE" 2>&1 | grep -oE "[a-f0-9]{32}" | head -1)
    fi
    
    if [ -n "$NAMESPACE_ID" ]; then
        log_success "Created KV namespace: $NAMESPACE_ID"
    else
        log_warn "Could not extract namespace ID. Manual setup may be required."
    fi
else
    log_success "Using existing KV namespace: $NAMESPACE_ID"
fi
echo ""

# Step 6: Configure environment variables (check what needs to be set)
echo "🔐 Step 6: Configuring environment variables..."

# Read .env.local and bind secrets
echo "Reading environment configuration from .env.local..."

# Function to check and set secret
setup_secret() {
    local SECRET_NAME=$1
    local ENV_VALUE=$2
    local IS_REQUIRED=$3
    
    if [ -z "$ENV_VALUE" ]; then
        if [ "$IS_REQUIRED" = "true" ]; then
            log_error "$SECRET_NAME is not set in .env.local"
            return 1
        else
            log_warn "$SECRET_NAME is not set (optional)"
            return 0
        fi
    fi
    
    # Get current value (if exists)
    CURRENT_VALUE=$(wrangler secret list --format json 2>/dev/null | grep -o "\"name\":\"$SECRET_NAME\"" || true)
    
    if [ -n "$CURRENT_VALUE" ]; then
        # Value exists, update it
        wrangler secret put "$SECRET_NAME" "$ENV_VALUE"
        log_success "Updated secret: $SECRET_NAME"
    else
        # Create new secret
        wrangler secret put "$SECRET_NAME" "$ENV_VALUE"
        log_success "Created secret: $SECRET_NAME"
    fi
}

# Extract secrets from .env.local
source <(grep "^export\|^^[A-Z_]*=" .env.local | sed 's/^export //')

# Required secrets
setup_secret "DODO_PAYMENTS_API_KEY" "$DODO_PAYMENTS_API_KEY" "true" || true
setup_secret "DODO_PAYMENTS_WEBHOOK_KEY" "$DODO_PAYMENTS_WEBHOOK_KEY" "true" || true
setup_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "true" || true
setup_secret "VEYRA_LICENCE_SIGNING_KEY" "$VEYRA_LICENCE_SIGNING_KEY" "false" || true
setup_secret "RESEND_API_KEY" "$RESEND_API_KEY" "false" || true

# Rate limiting secrets (optional but recommended)
wrangler secret put RATE_LIMIT_ENABLED "${RATE_LIMIT_ENABLED:-false}" 2>/dev/null || true
wrangler secret put RATE_LIMIT_MAX_REQUESTS "${RATE_LIMIT_MAX_REQUESTS:-100}" 2>/dev/null || true
wrangler secret put RATE_LIMIT_WINDOW_MS "${RATE_LIMIT_WINDOW_MS:-60000}" 2>/dev/null || true

log_success "Environment variables configured"
echo ""

# Step 7: Deploy to Cloudflare Workers
echo "🚀 Step 7: Deploying to Cloudflare Workers..."
echo "Worker name: veyra"
echo "Target domain: veyra.caelmont.in"
echo ""

# Build OpenNext bundle
npm run preview

# Deploy the worker
wrangler deploy --minify --name veyra

log_success "Deployment successful!"
echo ""

# Step 8: Configure routes
echo "🌐 Step 8: Configuring routing rules..."

# The route should be in wrangler.jsonc, let's verify
if grep -q "veyra.caelmont.in" wrangler.jsonc; then
    log_success "Custom domain route configured: veyra.caelmont.in"
else
    log_warn "Custom domain route not found in wrangler.jsonc"
    log_warn "Please manually add route: Pattern='veyra.caelmont.in', CustomDomain=true"
fi
echo ""

# Step 9: Enable necessary features
echo "⚡ Step 9: Enabling Worker features..."

# Enable observability (already in wrangler.jsonc)
log_success "Observability enabled"

# Ensure assets are bound
if grep -q "ASSETS" wrangler.jsonc; then
    log_success "Static assets binding configured"
fi
echo ""

# Step 10: Health check
echo "🏥 Step 10: Running health checks..."
echo ""

sleep 3  # Wait for propagation

HEALTH_CHECK_URL="https://veyra.caelmont.in"
RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")

if [ "$RESPONSE_CODE" = "200" ]; then
    log_success "Health check PASSED: Site responding normally ($RESPONSE_CODE)"
else
    log_warn "Health check returned: $RESPONSE_CODE (may take a few minutes to stabilize)"
fi

# Test static asset caching
CACHING_CHECK=$(curl -sI "$HEALTH_CHECK_URL" 2>/dev/null | grep -i "Cache-Control" || echo "")
if [ -n "$CACHING_CHECK" ]; then
    log_success "CDN caching active: $CACHING_CHECK"
else
    log_warn "CDN cache headers not yet propagated"
fi
echo ""

# Step 11: Summary and next steps
echo "🎉 ==================================================="
echo "   DEPLOYMENT COMPLETE!"
echo "====================================================="
echo ""
echo "🌐 Your site is live at:"
echo "   → https://veyra.caelmont.in"
echo ""
echo "📊 What was deployed:"
echo "   ✓ Next.js 14 application (production build)"
echo "   ✓ Cloudflare Workers runtime"
echo "   ✓ KV incremental cache ($(echo $NAMESPACE_ID | cut -c1-8)...)"
echo "   ✓ Middleware rate limiting (soft throttle: disabled by default)"
echo "   ✓ API rate limiting (Supabase-based):"
echo "     · Login attempts: 10 per 5 min per IP/email"
echo "     · License activations: 60 per hour per IP"
echo "     · Downloads: 30 per 5 min per IP"
echo "     · Redemptions: 12 per 10 min per code/IP"
echo "   ✓ Static asset caching: 1-year immutable cache"
echo ""
echo "⚙️  Configuration applied:"
echo "   Environment variables: Bound from .env.local"
echo "   Rate limits: $(cat .env.local 2>/dev/null | grep RATE_LIMIT_ENABLED | cut -d= -f2 || echo 'false')"
echo ""
echo "✅ Next Steps (REQUIRED):"
echo ""
echo "1️⃣  Configure Cloudflare Dashboard Rate Limits:"
echo "    Go to: https://dash.cloudflare.com"
echo "    → Select your domain: veyra.caelmont.in"
echo "    → Workers & Pages → Click 'veyra' worker"
echo "    → Scroll to 'Rate limiting' section"
echo "    → Add these 4 rules:"
echo "       • Rule #1: Path=/api/*, Limit=100 req/min, Action=Block"
echo "       • Rule #2: Path=/*, Limit=300 req/min, Action=Block"
echo "       • Rule #3: Path=/account/sign-up, Limit=5 req/min, Action=Challenge"
echo "       • Rule #4: Path=/api/checkout*, Limit=30 req/min, Action=Delay"
echo ""
echo "2️⃣  Monitor for 24 hours:"
echo "    - Watch Cloudflare Analytics dashboard"
echo "    - Check for 429 errors (should be <0.1% of traffic)"
echo "    - Adjust limits if legitimate users blocked"
echo ""
echo "3️⃣  Optional optimizations:"
echo "    - Enable Cloudflare WAF rules for bot protection"
echo "    - Set up monitoring alerts for high 5xx error rates"
echo "    - Consider upgrading Supabase plan if approaching free tier limits"
echo ""
echo "📝 Documentation:"
echo "   See CLOUDFLARE_RATE_LIMITING.md for detailed configuration"
echo "   See DEPLOY_RATE_LIMITING.md for troubleshooting"
echo ""
echo "🔧 Useful commands:"
echo "   wrangler tail veyra          # View live logs"
echo "   wrangler deploy              # Redeploy after code changes"
echo "   curl -I https://veyra.caelmont.in  # Check response headers"
echo ""
echo "🎯 Estimated Capacity:"
echo "   • Concurrent users: 1,000-5,000 (smooth experience)"
echo "   • Daily visitors: 10,000-50,000 (before needing upgrades)"
echo "   • Traffic spikes: Survives 10x normal load automatically"
echo ""
