# Database Setup Guide for RouteIQ

This guide will help you set up Neon PostgreSQL database for RouteIQ with proper schema, migrations, and the AI agent.

## Prerequisites

1. **Neon Account**: Sign up at [neon.tech](https://neon.tech) (free tier available)
2. **Node.js**: Version 18 or higher
3. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)
4. **Composio API Key**: Get from [composio.dev](https://composio.dev)

## Step 1: Create a Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click "Create Project"
3. Name your project "RouteIQ"
4. Select a region (choose closest to your users)
5. Copy the connection string (it looks like: `postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:

```env
# Required - Neon Database
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/routeiq?sslmode=require

# Required - OpenAI for AI Agent
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Required - Composio for integrations
COMPOSIO_API_KEY=your_composio_api_key_here

# Optional - Composio Connected Accounts (configure after connecting apps)
COMPOSIO_CRM_ACCOUNT_ID=conn_hubspot_xxxxx
COMPOSIO_CRM_TOOLKIT=hubspot
COMPOSIO_SLACK_ACCOUNT_ID=conn_slack_xxxxx
COMPOSIO_GMAIL_ACCOUNT_ID=conn_gmail_xxxxx
COMPOSIO_STRIPE_ACCOUNT_ID=conn_stripe_xxxxx

# Optional - Slack Configuration
SLACK_DEFAULT_CHANNEL=#sales

# Optional - HubSpot Owner Mapping
HUBSPOT_OWNER_MAP={"Alice":"12345","Bob":"67890"}

# Optional - App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Generate and Push Database Schema

Run the following commands to set up your database:

```bash
# Generate migration files from schema
npm run db:generate

# Push schema to Neon database (recommended for development)
npm run db:push
```

**Alternative**: If you prefer to use migrations instead:
```bash
npm run db:migrate
```

## Step 4: Verify Database Setup

You can use Drizzle Studio to visually inspect your database:

```bash
npm run db:studio
```

This will open a web interface at `https://local.drizzle.studio` where you can:
- View all tables
- Browse data
- Run queries
- Manage schema

## Database Schema Overview

The database includes the following tables:

### 1. `leads`
Stores lead information with fields:
- `id`, `name`, `email`, `company`
- `potential` (0-100 score)
- `status` (new, contacted, waiting_reply, qualified, won, lost)
- `owner`, `createdAt`, `lastContactAt`, `updatedAt`

### 2. `activities`
Activity log/audit trail:
- `id`, `type`, `leadId`, `message`, `timestamp`
- `meta` (JSONB for additional data)
- `status` (success, error, pending)

### 3. `emails`
Email history:
- `id`, `leadId`, `subject`, `snippet`, `body`
- `from`, `to`, `timestamp`

### 4. `agent_sessions`
AI agent conversation sessions:
- `id`, `userId`, `composioSessionId`, `mcpUrl`
- `state` (JSONB for conversation context)
- `createdAt`, `lastActiveAt`, `expiresAt`

### 5. `agent_messages`
AI agent message history:
- `id`, `sessionId`, `role` (user/assistant/system/tool)
- `content`, `toolCalls` (JSONB)
- `timestamp`

## API Endpoints with Pagination

### Leads API
```http
GET /api/leads?userId=xxx&page=1&limit=20&status=qualified&potentialMin=70
```

Response:
```json
{
  "leads": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Activity API
```http
GET /api/activity?leadId=xxx&page=1&limit=50
```

### AI Agent Chat API
```http
POST /api/agent/chat
{
  "userId": "user123",
  "sessionId": "agent_xxx", // optional, creates new session if not provided
  "message": "Show me qualified leads with score over 80"
}
```

Response:
```json
{
  "success": true,
  "sessionId": "agent_xxx",
  "response": "I found 15 qualified leads with a score over 80...",
  "toolCalls": [
    {
      "name": "search_leads",
      "arguments": "{\"status\":\"qualified\",\"potentialMin\":80}"
    }
  ]
}
```

### Agent Session API
```http
GET /api/agent/session?sessionId=agent_xxx
```

## AI Agent Capabilities

The AI agent uses OpenAI GPT-4 with function calling and has access to:

1. **Lead Management**
   - `search_leads` - Search with filters and pagination
   - `get_lead_details` - Get detailed lead info
   - `update_lead_status` - Change lead status

2. **Communication**
   - `send_email` - Send emails via Gmail
   - `notify_slack` - Post to Slack channels

3. **Billing**
   - `create_invoice` - Create Stripe invoices

4. **Advanced Composio Tools**
   - `execute_composio_tool` - Access any Composio meta-tool
   - Includes: COMPOSIO_SEARCH_TOOLS, COMPOSIO_CREATE_PLAN, etc.

## Example Usage

### 1. Simple Lead Search
```javascript
const response = await fetch('/api/leads?userId=user123&page=1&limit=10&status=new');
const { leads, pagination } = await response.json();

console.log(`Found ${pagination.total} leads`);
console.log(`Showing page ${pagination.page} of ${pagination.totalPages}`);
```

### 2. Chat with AI Agent
```javascript
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    message: 'Send a follow-up email to lead L-1001'
  })
});

const { response: agentResponse, toolCalls } = await response.json();
console.log('Agent:', agentResponse);
console.log('Tools used:', toolCalls);
```

### 3. Paginated Activity Feed
```javascript
const response = await fetch('/api/activity?page=1&limit=20');
const { activity, pagination } = await response.json();

// Show next page
if (pagination.hasNext) {
  const nextPage = await fetch(`/api/activity?page=${pagination.page + 1}&limit=20`);
}
```

## Migrating from In-Memory Store

If you have existing demo data in the in-memory store (`src/app/api/_store.ts`), you'll need to:

1. **Export existing data** (optional):
   ```javascript
   // In your API route
   import { getLeads, getActivity } from '@/app/api/_store';
   const existingLeads = getLeads();
   const existingActivity = getActivity();
   // Save to JSON files for backup
   ```

2. **Import to database**:
   ```javascript
   import { createLead, createActivity } from '@/lib/db/queries';

   for (const lead of existingLeads) {
     await createLead(lead);
   }

   for (const activity of existingActivity) {
     await createActivity(activity);
   }
   ```

3. **Update frontend code** to handle pagination:
   ```javascript
   // Old: const leads = data.leads;
   // New:
   const { leads, pagination } = data;
   ```

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure Neon database is active (not suspended)
- Check firewall/network settings

### Schema Errors
- Run `npm run db:push` to sync schema
- Check for TypeScript errors in schema.ts

### Agent Not Working
- Verify `OPENAI_API_KEY` is set
- Verify `COMPOSIO_API_KEY` is set
- Check OpenAI account has credits
- Review logs for error messages

### Pagination Not Working
- Ensure you're passing `page` and `limit` parameters
- Check that queries are using the new API format

## Production Recommendations

1. **Use Connection Pooling**: Neon supports pooling out of the box
2. **Set up Backups**: Neon provides automatic backups
3. **Monitor Performance**: Use Neon's metrics dashboard
4. **Add Indexes**: Schema includes indexes for common queries
5. **Implement Rate Limiting**: Protect AI agent endpoints
6. **Add Authentication**: Secure all API routes
7. **Cache Results**: Use Redis for frequently accessed data
8. **Log Agent Conversations**: Already stored in `agent_messages` table

## Next Steps

1. ✅ Database schema created
2. ✅ Pagination implemented
3. ✅ AI agent with OpenAI + Composio
4. 📝 Connect Composio apps (HubSpot, Gmail, Slack, Stripe)
5. 📝 Add sample data for testing
6. 📝 Build frontend components for pagination
7. 📝 Implement authentication/authorization
8. 📝 Deploy to production

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Composio Documentation](https://docs.composio.dev)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Neon/Drizzle/OpenAI documentation
3. Check application logs: `npm run dev` (view console output)
4. Inspect database: `npm run db:studio`
