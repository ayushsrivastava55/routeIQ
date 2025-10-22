This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

**⚠️ IMPORTANT:** You must configure environment variables before the app will work.

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# Required - Neon Database
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/routeiq?sslmode=require

# Required - OpenAI for AI Agent
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Required - Composio for integrations
COMPOSIO_API_KEY=your_composio_api_key_here

# Optional - Connected accounts (configure after connecting apps)
COMPOSIO_CRM_ACCOUNT_ID=conn_hubspot_xxxxx
COMPOSIO_SLACK_ACCOUNT_ID=conn_slack_xxxxx
COMPOSIO_GMAIL_ACCOUNT_ID=conn_gmail_xxxxx
COMPOSIO_STRIPE_ACCOUNT_ID=conn_stripe_xxxxx

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
SLACK_DEFAULT_CHANNEL=#sales
HUBSPOT_OWNER_MAP={"Alice":"12345","Bob":"67890"}
```

**📖 See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed database setup instructions.**

### 3. Set Up Database

**⚠️ IMPORTANT:** RouteIQ now uses Neon PostgreSQL for data persistence.

```bash
# Generate and push database schema to Neon
npm run db:push

# (Optional) Seed sample data for testing
npx tsx scripts/seed-sample-data.ts

# (Optional) Open Drizzle Studio to view your data
npm run db:studio
```

**📖 Full database setup guide:** [DATABASE_SETUP.md](./DATABASE_SETUP.md)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Connect Your Apps (Optional)

1. Visit http://localhost:3000/apps
2. Enter your User ID (email or unique identifier)
3. Click **Connect** for each integration:
   - **HubSpot** (optional for CRM sync)
   - **Gmail** (optional for email sending)
   - **Slack** (optional for notifications)
   - **Stripe** (optional for invoicing)
   - **DocuSign** (optional for contracts)

**📖 Full setup guide:** [ENV_SETUP.md](./ENV_SETUP.md)

## Features

### 🤖 AI Agent with OpenAI + Composio

RouteIQ includes an intelligent AI agent powered by OpenAI GPT-4 with Composio integrations:

- **Natural Language Interface**: Chat with the agent to manage leads, send emails, create invoices
- **Function Calling**: Agent can execute actions using Composio tools
- **Context Awareness**: Maintains conversation history and session state
- **Multi-Tool Workflows**: Execute complex workflows across multiple apps

**Example Usage:**
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "Show me all qualified leads with score above 80"
  }'
```

### 📊 Pagination Support

All API endpoints now support pagination:

- **Leads**: `/api/leads?page=1&limit=20&status=qualified`
- **Activities**: `/api/activity?page=1&limit=50&leadId=L-1001`
- Responses include pagination metadata (total, totalPages, hasNext, hasPrev)

### 🗄️ Neon PostgreSQL Database

- Persistent storage for leads, activities, emails
- Efficient indexing for fast queries
- Agent session and message history storage
- Easy to manage with Drizzle ORM and Studio

**Database Commands:**
```bash
npm run db:generate  # Generate migrations
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open visual database browser
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## RouteIQ Features

### 🎯 Leads Management
Filter by potential score, date range, and status. Quick actions for email resend and Slack notifications to reduce response times and follow-up delays.

### 📊 Activity Feed
Unified log of all cross-tool actions (emails sent, Slack notifications, invoices created) for complete campaign visibility.

### 💬 AI Assistant
Natural language command interface for instant actions (resend emails, notify Slack, create invoices).

### 📈 Analytics Dashboards
- **Admin View:** Response times, conversion rates, status distribution
- **Marketing View:** Email engagement, campaign performance, lead quality

### 🔌 Integrations (via Composio)
- **HubSpot** - CRM and contact management
- **Gmail** - Email viewing and sending
- **Slack** - Team notifications
- **Stripe** - Invoicing and payments
- **DocuSign** - Contract sending

---

## Architecture

- **Frontend:** Next.js 15 with App Router, React 19, TailwindCSS
- **Backend:** Next.js API routes with Composio SDK integration
- **Integrations:** Composio `proxyExecute` for direct SaaS API calls
- **State:** In-memory activity store (replace with DB for production)
- **Auth:** Per-user OAuth via Composio connected accounts

---

## Project Structure

```
routeiq/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (leads, notify, deals, etc.)
│   │   ├── leads/         # Lead management UI
│   │   ├── activity/      # Activity feed
│   │   ├── chat/          # AI assistant
│   │   ├── admin/         # Admin dashboard
│   │   ├── marketing/     # Marketing dashboard
│   │   └── apps/          # App connection manager
│   ├── lib/
│   │   ├── composio.ts    # Composio client
│   │   ├── persist.ts     # Activity storage
│   │   └── types.ts       # TypeScript types
│   └── components/        # Reusable UI components
├── ENV_SETUP.md          # Environment setup guide
└── PRD.md                # Product requirements
