# Environment Setup Guide

## Step 1: Create `.env.local` File

Create a file named `.env.local` in the root of the `routeiq` project with the following variables:

```bash
# ==========================================
# REQUIRED - Composio API Key
# ==========================================
COMPOSIO_API_KEY=your_composio_api_key_here

# ==========================================
# OPTIONAL - Application Settings
# ==========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Slack default channel for notifications
SLACK_DEFAULT_CHANNEL=#sales-leads

# HubSpot owner assignment mapping (JSON format)
# Maps assignment targets to HubSpot owner IDs
HUBSPOT_OWNER_MAP={"sam":"123456","li":"789012","queue":"345678"}
```

---

## Step 2: Get Your Composio API Key

### **What is Composio?**
Composio is the integration platform that connects your app to HubSpot, Gmail, Slack, Stripe, DocuSign, etc.

### **How to Get It:**

1. **Sign Up for Composio**
   - Go to: https://app.composio.dev/
   - Click "Sign Up" (free tier available)
   - Complete registration

2. **Get Your API Key**
   - After login, go to: https://app.composio.dev/settings
   - Navigate to **API Keys** section
   - Click **"Generate New API Key"**
   - Copy the key (starts with `sk_...`)

3. **Add to `.env.local`**
   ```bash
   COMPOSIO_API_KEY=sk_your_actual_key_here
   ```

**Documentation:** https://docs.composio.dev/introduction/intro/overview

---

## Step 3: Connect Your Apps (via RouteIQ UI)

Once you have `COMPOSIO_API_KEY` set up, you'll connect apps through the RouteIQ interface:

### **Using the Apps Page:**

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Visit the Apps page:**
   ```
   http://localhost:3000/apps
   ```

3. **Enter Your User ID:**
   - Use your email or any unique identifier (e.g., `you@example.com`)
   - This will be stored in `localStorage` and used for all API calls

4. **Connect Each App:**
   Click the **Connect** button for each integration you want to use:

   - **HubSpot** (CRM)
     - Required for: Lead management, contacts, owner assignment
     - OAuth flow will open in popup
     - Approve access to your HubSpot account
   
   - **Gmail** (Email)
     - Required for: Viewing lead emails, sending follow-ups
     - Use your Google account
     - Grant read/send email permissions
   
   - **Slack** (Notifications)
     - Required for: Team notifications
     - Choose workspace and authorize
     - Note the channel names you want to use
   
   - **Stripe** (Billing)
     - Required for: Creating invoices, customers
     - Connect your Stripe account
     - Works in test mode by default
   
   - **DocuSign** (Contracts)
     - Optional: For sending contracts
     - Connect your DocuSign account

5. **Status Indicators:**
   - ✅ Green "Connected" badge = Ready to use
   - 🔴 Red "Connect" button = Not connected yet

---

## Step 4: Optional Environment Variables

### **Slack Default Channel**

After connecting Slack, set a default channel for notifications:

```bash
SLACK_DEFAULT_CHANNEL=#sales-leads
```

**How to find channel name:**
- Open Slack
- Go to the channel you want to use
- Channel name is shown at the top (include the `#`)

---

### **HubSpot Owner Mapping**

To use the automated lead assignment feature, you need HubSpot owner IDs:

**How to get HubSpot Owner IDs:**

1. **Via HubSpot UI:**
   - Go to Settings → Users & Teams
   - Click on a user
   - The URL will show: `/settings/users/{owner-id}`
   - Copy the number

2. **Via API:**
   ```bash
   curl -X GET "https://api.hubapi.com/crm/v3/owners" \
     -H "Authorization: Bearer YOUR_HUBSPOT_ACCESS_TOKEN"
   ```

3. **Create the mapping:**
   ```bash
   HUBSPOT_OWNER_MAP={"sam":"12345","li":"67890","queue":"11111"}
   ```

**What this does:**
- Leads with score ≥ 85 → assigned to "sam"
- Leads with score ≥ 70 → assigned to "li"
- All others → assigned to "queue"

---

## Complete `.env.local` Example

```bash
# Composio Integration (REQUIRED)
COMPOSIO_API_KEY=sk_comp_abc123xyz789...

# App Settings (OPTIONAL)
NEXT_PUBLIC_APP_URL=http://localhost:3000
SLACK_DEFAULT_CHANNEL=#sales-leads
HUBSPOT_OWNER_MAP={"sam":"12345","li":"67890","queue":"11111"}
```

---

## Step 5: Verify Setup

### **1. Check API Key:**
```bash
# Start the dev server
npm run dev

# Open browser
http://localhost:3000
```

If you see errors about `COMPOSIO_API_KEY is not set`, double-check your `.env.local` file.

### **2. Test App Connections:**
- Go to http://localhost:3000/apps
- Enter your user ID
- Click "Connect" for HubSpot
- If OAuth popup opens → ✅ API key is working
- If error → ❌ Check API key

### **3. Test Lead Fetching:**
- Go to http://localhost:3000/leads
- If you see HubSpot contacts → ✅ Integration working
- If error → Check that HubSpot is connected

---

## Troubleshooting

### **Error: "COMPOSIO_API_KEY is not set"**
- Ensure file is named `.env.local` (not `.env` or `.env.local.txt`)
- Restart the dev server after adding the key
- Check for typos in the variable name

### **Error: "hubspot connected account not found"**
- Make sure you've connected HubSpot via `/apps` page
- Verify your `userId` is entered correctly
- Try disconnecting and reconnecting HubSpot

### **OAuth popup blocked**
- Allow popups in your browser settings
- Or manually open the auth link in a new tab

### **401 Unauthorized errors**
- Your Composio API key may be invalid
- Generate a new key from https://app.composio.dev/settings

---

## Additional Resources

- **Composio Docs:** https://docs.composio.dev/
- **HubSpot API:** https://developers.hubspot.com/docs/api/overview
- **Gmail API:** https://developers.google.com/gmail/api/guides
- **Slack API:** https://api.slack.com/docs
- **Stripe API:** https://stripe.com/docs/api
- **DocuSign API:** https://developers.docusign.com/docs/esign-rest-api/

---

## Quick Start Checklist

- [ ] Sign up for Composio account
- [ ] Get API key from Composio dashboard
- [ ] Create `.env.local` with `COMPOSIO_API_KEY`
- [ ] Run `npm run dev`
- [ ] Visit `/apps` page
- [ ] Enter your user ID (email)
- [ ] Connect HubSpot (required)
- [ ] Connect Gmail (required for emails)
- [ ] Connect Slack (optional for notifications)
- [ ] Connect Stripe (optional for invoicing)
- [ ] Test by visiting `/leads` page

---

**Need Help?**
- Composio Support: https://docs.composio.dev/
- Create an issue in the repo with error logs
