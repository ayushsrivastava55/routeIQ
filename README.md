This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

**⚠️ IMPORTANT:** You must configure Composio before the app will work.

Create a `.env.local` file in the root directory:

```bash
# Required - Get from https://app.composio.dev/settings
COMPOSIO_API_KEY=your_api_key_here

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
SLACK_DEFAULT_CHANNEL=#sales-leads
HUBSPOT_OWNER_MAP={"sam":"12345","li":"67890","queue":"11111"}
```

**📖 See [ENV_SETUP.md](./ENV_SETUP.md) for detailed setup instructions.**

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 4. Connect Your Apps

1. Visit http://localhost:3000/apps
2. Enter your User ID (email or unique identifier)
3. Click **Connect** for each integration:
   - **HubSpot** (required for leads)
   - **Gmail** (required for emails)
   - **Slack** (optional for notifications)
   - **Stripe** (optional for invoicing)
   - **DocuSign** (optional for contracts)

**📖 Full setup guide:** [ENV_SETUP.md](./ENV_SETUP.md)

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
