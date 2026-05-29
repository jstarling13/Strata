# Strata

Strata connects to a business's existing POS or booking data and surfaces staff performance intelligence the owner never had before — which employees generate repeat customers, which shifts are unprofitable after labor costs, and where hours should be reallocated to maximize profit.

## Local setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or Railway)
- Clerk account (free tier works)
- Stripe account (test mode)
- Anthropic API key
- Resend account (free tier works)
- Square Developer account (for sandbox testing)

### 1. Clone and install

```bash
git clone <repo>
cd strata
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

**Clerk:**
1. Create app at clerk.com
2. Copy publishable key and secret key
3. Add redirect URLs: `http://localhost:3000/sign-in`, `http://localhost:3000/sign-up`
4. Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
5. Set after-auth redirects: sign-in → `/dashboard`, sign-up → `/onboarding`

**Stripe:**
1. Create account at stripe.com (test mode)
2. Create two products:
   - **Standard**: $129/month recurring → copy price ID to `STRIPE_STANDARD_PRICE_ID`
   - **Plus**: $229/month recurring → copy price ID to `STRIPE_PLUS_PRICE_ID`
3. Set up webhook endpoint: `https://your-domain/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**Square sandbox:**
1. Create app at developer.squareup.com
2. Copy sandbox App ID → `SQUARE_APP_ID` and `NEXT_PUBLIC_SQUARE_APP_ID`
3. Copy sandbox App Secret → `SQUARE_APP_SECRET`
4. Set `SQUARE_ENVIRONMENT=sandbox`
5. Add OAuth redirect URL: `http://localhost:3000/api/square/callback`

### 3. Database setup

```bash
npm run db:push      # Push schema to your PostgreSQL database
npm run db:generate  # Generate Prisma client
```

### 4. Seed realistic test data

The seed script creates a restaurant called "The Corner Table" with 5 staff members and 90 days of realistic transaction data designed to demonstrate key Strata features:

```bash
npm run db:seed
```

This creates:
- **Maria Santos** — 68% repeat rate (star performer — 2.2x team average)
- **Priya Patel** — 61% repeat rate (strong performer)
- **James Lee** — 45% repeat rate (average)
- **Sam Torres** — 38% repeat rate (below average)
- **Devon Clark** — 22% repeat rate (low performer)
- **Thursday lunch** — deliberately slow shift (labor cost ~190% of sales)

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Trigger the insight agent locally

After seeding, run the attribution + AI insight generation for your test org:

```bash
# Get the seeded org ID:
# psql $DATABASE_URL -c 'SELECT id, name FROM "Organization"'

curl "http://localhost:3000/api/agents/weekly-digest?orgId=YOUR_ORG_ID&secret=$CRON_SECRET"
```

Or inspect data with Prisma Studio:

```bash
npm run db:studio
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/onboarding` |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STANDARD_PRICE_ID` | Stripe price ID for $129/mo plan |
| `STRIPE_PLUS_PRICE_ID` | Stripe price ID for $229/mo plan |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SQUARE_APP_ID` | Square app ID (sandbox or production) |
| `SQUARE_APP_SECRET` | Square app secret |
| `NEXT_PUBLIC_SQUARE_APP_ID` | Square app ID (public) |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` |
| `TOAST_API_BASE` | Toast API base URL |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender email address |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. https://strata.ai) |
| `CRON_SECRET` | Random secret for protecting cron endpoints |
| `ADMIN_USER_IDS` | Comma-separated Clerk user IDs with admin access |

## Railway deployment

### Cron jobs

Set up two Railway cron services pointing at your deployed app:

**Weekly digest** (Sunday 11pm UTC):
```
Cron: 0 23 * * 0
Command: curl -X POST https://your-app.railway.app/api/agents/weekly-digest \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Daily anomaly check** (8am UTC, Plus tier only):
```
Cron: 0 8 * * *
Command: curl -X POST https://your-app.railway.app/api/agents/anomaly-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Deployment checklist
1. Add all env vars to Railway
2. Set `NODE_ENV=production`
3. Set `NEXT_PUBLIC_APP_URL` to your production URL
4. Run `npm run db:push` against production DB
5. Update Clerk redirect URLs to production domain
6. Update Stripe webhook to production URL
7. Update Square OAuth redirect to production URL

## Week 1 roadmap

**Goal:** Find 2 restaurant owners with Square, offer 30-day free trial in exchange for feedback.

**Channels:**
- Local Facebook restaurant owner groups
- r/restaurantowners
- LinkedIn DM local restaurant operators

**Qualification criteria:**
- Uses Square (fastest setup via OAuth)
- 5-25 employees
- Operating 6+ months (needs transaction history)
- Owner-operated

**Feedback to collect:**
1. Did the repeat rate data match your gut feel about your best staff?
2. What shift data surprised you most?
3. What would make you pay $129/month for this after the trial?
4. What's missing?

## Architecture notes

- **Data flow**: POS data -> `Transaction` records -> attribution engine builds `CustomerVisit` + `StaffWeeklyStats` + `ShiftPerformance` -> insight agent calls Claude API -> `WeeklyDigest` -> email
- **Repeat customer detection**: Customer ID from Square/Toast POS. If `customerId` appeared in a prior transaction, `isRepeat = true`
- **Shift profitability**: `laborCost = shiftHours x avgHourlyRate x estimatedHeadcount`. Estimated headcount = `ceil(staffCount / 4)` as proxy
- **AI model**: `claude-sonnet-4-20250514` for weekly batch insight generation
