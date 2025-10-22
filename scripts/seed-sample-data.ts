/**
 * Sample Data Seeding Script
 *
 * This script populates the database with sample leads and activities for testing.
 *
 * Usage:
 *   npx tsx scripts/seed-sample-data.ts
 */

import { createLead, createActivity } from "../src/lib/db/queries";

const sampleLeads = [
  {
    id: "L-1001",
    name: "Alice Johnson",
    email: "alice.johnson@techcorp.com",
    company: "TechCorp Inc",
    potential: 85,
    status: "qualified" as const,
    owner: "Alice",
    createdAt: new Date("2025-01-15"),
    lastContactAt: new Date("2025-01-20"),
  },
  {
    id: "L-1002",
    name: "Bob Smith",
    email: "bob.smith@startup.io",
    company: "Startup.io",
    potential: 92,
    status: "contacted" as const,
    owner: "Bob",
    createdAt: new Date("2025-01-18"),
    lastContactAt: new Date("2025-01-19"),
  },
  {
    id: "L-1003",
    name: "Carol Davis",
    email: "carol@enterprise.com",
    company: "Enterprise Solutions",
    potential: 78,
    status: "waiting_reply" as const,
    owner: "Alice",
    createdAt: new Date("2025-01-20"),
    lastContactAt: new Date("2025-01-21"),
  },
  {
    id: "L-1004",
    name: "David Lee",
    email: "david.lee@innovate.com",
    company: "Innovate Labs",
    potential: 65,
    status: "new" as const,
    owner: null,
    createdAt: new Date("2025-01-22"),
    lastContactAt: null,
  },
  {
    id: "L-1005",
    name: "Emma Wilson",
    email: "emma@growthco.com",
    company: "GrowthCo",
    potential: 95,
    status: "won" as const,
    owner: "Bob",
    createdAt: new Date("2025-01-10"),
    lastContactAt: new Date("2025-01-21"),
  },
];

const sampleActivities = [
  {
    id: "A-1001",
    type: "lead_created" as const,
    leadId: "L-1001",
    message: "Lead created: Alice Johnson from TechCorp Inc",
    timestamp: new Date("2025-01-15"),
    status: "success" as const,
    meta: {},
  },
  {
    id: "A-1002",
    type: "email_sent" as const,
    leadId: "L-1001",
    message: "Welcome email sent to Alice Johnson",
    timestamp: new Date("2025-01-15"),
    status: "success" as const,
    meta: {},
  },
  {
    id: "A-1003",
    type: "slack_notified" as const,
    leadId: "L-1001",
    message: "Slack notification sent to #sales",
    timestamp: new Date("2025-01-15"),
    status: "success" as const,
    meta: {},
  },
  {
    id: "A-1004",
    type: "lead_created" as const,
    leadId: "L-1002",
    message: "Lead created: Bob Smith from Startup.io",
    timestamp: new Date("2025-01-18"),
    status: "success" as const,
    meta: {},
  },
  {
    id: "A-1005",
    type: "invoice_created" as const,
    leadId: "L-1005",
    message: "Invoice created for $5000 for GrowthCo",
    timestamp: new Date("2025-01-21"),
    status: "success" as const,
    meta: { amount: 5000, currency: "USD" },
  },
];

async function seedData() {
  console.log("🌱 Seeding sample data...\n");

  try {
    // Seed leads
    console.log("Creating sample leads...");
    for (const lead of sampleLeads) {
      await createLead(lead);
      console.log(`✓ Created lead: ${lead.name}`);
    }

    // Seed activities
    console.log("\nCreating sample activities...");
    for (const activity of sampleActivities) {
      await createActivity(activity);
      console.log(`✓ Created activity: ${activity.message}`);
    }

    console.log("\n✅ Sample data seeded successfully!");
    console.log("\nYou can now:");
    console.log("  1. View data in Drizzle Studio: npm run db:studio");
    console.log("  2. Query leads: GET /api/leads?userId=test&page=1&limit=10");
    console.log("  3. Chat with AI agent: POST /api/agent/chat");

  } catch (error: any) {
    console.error("\n❌ Error seeding data:", error.message);
    console.error("\nMake sure:");
    console.error("  1. DATABASE_URL is set in .env");
    console.error("  2. Database schema is pushed: npm run db:push");
    process.exit(1);
  }
}

// Run the seeding
seedData().catch(console.error);
