# RouteIQ AI Agent Tools Guide 🛠️

## Overview

The AI agent now has **11 powerful automation tools** that make chatting feel amazing! Each tool is fully integrated with the database and ready for Composio connections.

## Available Tools

### 1. **createLead** - Create New Leads

**What it does:** Creates a new lead in the CRM database  
**Use cases:**

- "Create a lead for john@example.com"
- "Add a new lead from Acme Corp"
- "Set up lead automation"

**Features:**

- Auto-generates lead ID
- Calculates potential score based on email domain
- Sets default status to "new"

---

### 2. **searchLeads** - Search & Filter Leads

**What it does:** Searches leads with advanced filtering  
**Use cases:**

- "Show me all qualified leads"
- "Find leads with score above 80"
- "List new leads from this week"

**Features:**

- Filter by status, potential score, owner, company
- Configurable result limit
- Returns formatted lead information

---

### 3. **updateLeadStatus** - Change Lead Status

**What it does:** Updates a lead's status in the pipeline  
**Use cases:**

- "Mark lead L-1001 as qualified"
- "Update John's lead to contacted"
- "Set lead status to won"

**Features:**

- Creates activity log automatically
- Returns updated lead information
- Supports all status types

---

### 4. **assignLead** - Assign Lead to Owner

**What it does:** Assigns a lead to a specific team member  
**Use cases:**

- "Assign lead L-1001 to Ayush"
- "Give that lead to Alice"
- "Set owner to Bob"

**Features:**

- Creates assignment activity log
- Returns updated lead with owner
- Supports any owner name

---

### 5. **getLeadAnalytics** - Get Insights & Metrics

**What it does:** Provides analytics and insights about leads  
**Use cases:**

- "Show me lead statistics"
- "What's our conversion rate?"
- "How many qualified leads do we have?"

**Features:**

- Timeframe filtering (today, week, month, all)
- Status breakdown
- Average potential score
- High potential lead count
- Conversion rate calculation

---

### 6. **bulkUpdateLeads** - Update Multiple Leads

**What it does:** Updates multiple leads at once  
**Use cases:**

- "Mark all qualified leads as won"
- "Assign these 5 leads to Alice"
- "Bulk update status"

**Features:**

- Processes multiple lead IDs
- Returns success/failure for each
- Creates activity logs for successful updates

---

### 7. **sendEmail** - Send Email via Gmail

**What it does:** Sends emails to leads (Composio integrated)  
**Use cases:**

- "Send email to john@example.com"
- "Email the lead about pricing"
- "Send welcome email"

**Features:**

- Creates email activity log
- Returns confirmation
- Ready for Gmail integration

---

### 8. **notifyTeam** - Slack Notifications

**What it does:** Sends notifications to team via Slack  
**Use cases:**

- "Notify team about new lead"
- "Send Slack message to #sales"
- "Alert the team"

**Features:**

- Channel selection
- Creates notification activity log
- Ready for Slack integration

---

### 9. **createInvoice** - Create Invoices

**What it does:** Creates invoices for deals (Stripe integrated)  
**Use cases:**

- "Create invoice for $5000"
- "Generate invoice for lead L-1001"
- "Bill the customer"

**Features:**

- Links to lead ID
- Supports multiple currencies
- Creates invoice activity log
- Ready for Stripe integration

---

### 10. **getActivityFeed** - View Activity History

**What it does:** Shows recent activity in the CRM  
**Use cases:**

- "Show me recent activity"
- "What happened today?"
- "Get activity feed"

**Features:**

- Configurable limit
- Shows all activity types
- Timestamp information

---

### 11. **searchAdvanced** - Advanced Search

**What it does:** Complex search with multiple criteria  
**Use cases:**

- "Find leads named John"
- "Search for Acme Corp"
- "Find leads with high potential"

**Features:**

- Text search across name, email, company
- Multiple filter combinations
- Returns detailed results

---

## How Tools Work Together

The AI agent intelligently combines multiple tools to complete complex tasks:

### Example 1: End-to-End Lead Automation

```
User: "Set up round-robin lead assignment with Ayush"
AI:
  1. Searches all unassigned leads
  2. Assigns them to Ayush
  3. Updates their status to "contacted"
  4. Notifies team via Slack
  5. Creates activity logs
```

### Example 2: Deal Closing Workflow

```
User: "Close the deal with L-1001 for $5000"
AI:
  1. Updates lead status to "won"
  2. Creates invoice for $5000
  3. Sends thank you email
  4. Notifies team
  5. Updates analytics
```

### Example 3: Analytics & Insights

```
User: "Show me lead analytics for this month"
AI:
  1. Gets lead analytics for current month
  2. Calculates conversion rates
  3. Identifies trends
  4. Provides actionable insights
```

---

## Tool Call Visualization

Every tool call is visualized in real-time:

- **Inline badges** under chat messages
- **Floating panel** showing active tool calls
- **Status indicators** (pending → executing → completed)
- **Console logs** for debugging

---

## Landing Page

The landing page has been restored with:

- Beautiful hero section
- "Start Chatting" CTA button
- "View Leads" secondary button
- Gradient text effects
- Modern design

---

## Demo Workflow

1. **Visit Landing Page** → Click "Start Chatting"
2. **Enter Email** → Set your userId
3. **Start Chatting** → Try these commands:
   - "Create a lead for john@example.com at Acme Corp"
   - "Show me all qualified leads"
   - "Assign lead L-1234 to Ayush"
   - "Get lead analytics"
   - "Send email to john@example.com"
   - "Create invoice for $5000"
   - "Notify team about new lead"
4. **Watch Tools Execute** → See real-time visualization
5. **View Results** → Check Leads page

---

## Next Steps

All tools are ready to integrate with Composio for real Gmail, Slack, and Stripe functionality. The AI agent is now a powerful CRM automation assistant! 🚀
