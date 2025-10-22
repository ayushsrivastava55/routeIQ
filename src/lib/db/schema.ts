// Database schema using Drizzle ORM for Neon PostgreSQL

import { pgTable, text, timestamp, integer, varchar, jsonb, index, pgEnum } from "drizzle-orm/pg-core";

// Enums for lead status
export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'contacted',
  'waiting_reply',
  'qualified',
  'won',
  'lost'
]);

// Enums for activity types
export const activityTypeEnum = pgEnum('activity_type', [
  'lead_created',
  'lead_enriched',
  'lead_assigned',
  'email_sent',
  'slack_notified',
  'invoice_created',
  'contract_sent',
  'followup_resend',
  'note',
  'agent_action'
]);

// Enums for activity status
export const activityStatusEnum = pgEnum('activity_status', [
  'success',
  'error',
  'pending'
]);

// Leads table
export const leads = pgTable('leads', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  potential: integer('potential').notNull().default(0), // 0-100 score
  status: leadStatusEnum('status').notNull().default('new'),
  owner: varchar('owner', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastContactAt: timestamp('last_contact_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  statusIdx: index('status_idx').on(table.status),
  potentialIdx: index('potential_idx').on(table.potential),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

// Activities table
export const activities = pgTable('activities', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: activityTypeEnum('type').notNull(),
  leadId: varchar('lead_id', { length: 255 }).references(() => leads.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  meta: jsonb('meta'), // Store additional metadata as JSON
  status: activityStatusEnum('status'),
}, (table) => ({
  leadIdIdx: index('activity_lead_id_idx').on(table.leadId),
  timestampIdx: index('activity_timestamp_idx').on(table.timestamp),
  typeIdx: index('activity_type_idx').on(table.type),
}));

// Emails table
export const emails = pgTable('emails', {
  id: varchar('id', { length: 255 }).primaryKey(),
  leadId: varchar('lead_id', { length: 255 }).notNull().references(() => leads.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 500 }).notNull(),
  snippet: text('snippet'),
  body: text('body').notNull(),
  from: varchar('from', { length: 255 }).notNull(),
  to: varchar('to', { length: 255 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  leadIdIdx: index('email_lead_id_idx').on(table.leadId),
  timestampIdx: index('email_timestamp_idx').on(table.timestamp),
}));

// AI Agent Sessions table (for tracking agent conversations and state)
export const agentSessions = pgTable('agent_sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  composioSessionId: varchar('composio_session_id', { length: 255 }),
  mcpUrl: text('mcp_url'),
  state: jsonb('state'), // Store conversation state, context, memory
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userIdIdx: index('agent_session_user_id_idx').on(table.userId),
  lastActiveIdx: index('agent_session_last_active_idx').on(table.lastActiveAt),
}));

// AI Agent Messages table (for conversation history)
export const agentMessages = pgTable('agent_messages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).notNull().references(() => agentSessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user', 'assistant', 'system', 'tool'
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'), // Store tool calls if any
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('agent_message_session_id_idx').on(table.sessionId),
  timestampIdx: index('agent_message_timestamp_idx').on(table.timestamp),
}));

// Export types for use in the application
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
