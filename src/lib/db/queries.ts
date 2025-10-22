// Database query utilities with pagination support

import { db, leads, activities, emails, agentSessions, agentMessages } from "./index";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import type { Lead, Activity, Email, AgentSession, AgentMessage } from "./schema";

// Pagination helper types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Lead queries
export async function getLeads(params: {
  potentialMin?: number;
  potentialMax?: number;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<Lead>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  if (params.potentialMin !== undefined) {
    conditions.push(gte(leads.potential, params.potentialMin));
  }

  if (params.potentialMax !== undefined) {
    conditions.push(lte(leads.potential, params.potentialMax));
  }

  if (params.status) {
    conditions.push(eq(leads.status, params.status as any));
  }

  if (params.from) {
    conditions.push(gte(leads.createdAt, new Date(params.from)));
  }

  if (params.to) {
    conditions.push(lte(leads.createdAt, new Date(params.to)));
  }

  // Get total count
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(leads)
    .where(whereClause);

  // Get paginated data
  const data = await db
    .select()
    .from(leads)
    .where(whereClause)
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(count / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(lead: Omit<Lead, "updatedAt">): Promise<Lead> {
  const [newLead] = await db.insert(leads).values(lead).returning();
  return newLead;
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
  const [updated] = await db
    .update(leads)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  return updated;
}

export async function deleteLead(id: string): Promise<void> {
  await db.delete(leads).where(eq(leads.id, id));
}

// Activity queries
export async function getActivities(params: {
  leadId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<Activity>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));
  const offset = (page - 1) * limit;

  const whereClause = params.leadId ? eq(activities.leadId, params.leadId) : undefined;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(activities)
    .where(whereClause);

  // Get paginated data
  const data = await db
    .select()
    .from(activities)
    .where(whereClause)
    .orderBy(desc(activities.timestamp))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(count / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function createActivity(activity: Omit<Activity, "timestamp">): Promise<Activity> {
  const [newActivity] = await db.insert(activities).values(activity).returning();
  return newActivity;
}

// Email queries
export async function getEmailsByLeadId(leadId: string, params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<Email>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(emails)
    .where(eq(emails.leadId, leadId));

  // Get paginated data
  const data = await db
    .select()
    .from(emails)
    .where(eq(emails.leadId, leadId))
    .orderBy(desc(emails.timestamp))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(count / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function createEmail(email: Omit<Email, "timestamp">): Promise<Email> {
  const [newEmail] = await db.insert(emails).values(email).returning();
  return newEmail;
}

// Agent Session queries
export async function getAgentSession(sessionId: string): Promise<AgentSession | undefined> {
  const result = await db.select().from(agentSessions).where(eq(agentSessions.id, sessionId)).limit(1);
  return result[0];
}

export async function createAgentSession(session: Omit<AgentSession, "createdAt" | "lastActiveAt">): Promise<AgentSession> {
  const [newSession] = await db.insert(agentSessions).values(session).returning();
  return newSession;
}

export async function updateAgentSession(sessionId: string, data: Partial<AgentSession>): Promise<AgentSession | undefined> {
  const [updated] = await db
    .update(agentSessions)
    .set({ ...data, lastActiveAt: new Date() })
    .where(eq(agentSessions.id, sessionId))
    .returning();
  return updated;
}

// Agent Message queries
export async function getAgentMessages(sessionId: string, params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<AgentMessage>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));
  const offset = (page - 1) * limit;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(agentMessages)
    .where(eq(agentMessages.sessionId, sessionId));

  // Get paginated data
  const data = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.sessionId, sessionId))
    .orderBy(asc(agentMessages.timestamp))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(count / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function createAgentMessage(message: Omit<AgentMessage, "timestamp">): Promise<AgentMessage> {
  const [newMessage] = await db.insert(agentMessages).values(message).returning();
  return newMessage;
}

// Cleanup expired sessions
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(agentSessions)
    .where(lte(agentSessions.expiresAt, new Date()))
    .returning();
  return result.length;
}
