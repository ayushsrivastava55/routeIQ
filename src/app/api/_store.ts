// Simple in-memory store for demo purposes.
// Resets on server restart. Replace with DB in production.

import type { Activity, Lead, Email } from "@/lib/types";

let LEADS: Lead[] = [
  {
    id: "L-1001",
    name: "Alice Johnson",
    email: "alice@acme.com",
    company: "Acme Co",
    potential: 85,
    status: "waiting_reply",
    owner: "sam",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: "L-1002",
    name: "Bob Smith",
    email: "bob@globex.com",
    company: "Globex",
    potential: 62,
    status: "contacted",
    owner: "li",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "L-1003",
    name: "Carol Lee",
    email: "carol@initech.io",
    company: "Initech",
    potential: 92,
    status: "new",
    owner: "sam",
    createdAt: new Date().toISOString(),
  },
];

const ACTIVITY: Activity[] = [
  {
    id: crypto.randomUUID(),
    type: "lead_created",
    leadId: "L-1003",
    message: "Lead created via webform",
    timestamp: new Date().toISOString(),
    status: "success",
  },
];

const EMAILS: Email[] = [
  {
    id: crypto.randomUUID(),
    leadId: "L-1001",
    subject: "Intro: Acme x RouteIQ",
    snippet: "Hi Alice, thanks for your interest...",
    body: "Hi Alice,\n\nThanks for your interest in RouteIQ. Here’s how we automate your lead-to-revenue ops...\n\nBest,\nSam",
    from: "sam@routeiq.app",
    to: "alice@acme.com",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    leadId: "L-1001",
    subject: "Follow-up: Quick call?",
    snippet: "Circling back on automation...",
    body: "Hi Alice,\n\nCircling back to see if you had a chance to review the workflow example. Happy to set up a 15-min call.\n\nThanks,\nSam",
    from: "sam@routeiq.app",
    to: "alice@acme.com",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    leadId: "L-1002",
    subject: "Intro: Globex growth ops",
    snippet: "Bob, here’s how we route leads...",
    body: "Hey Bob,\n\nWe can route leads, auto-enrich, and notify Slack in under a second. Attaching a sample.\n\nCheers,\nLi",
    from: "li@routeiq.app",
    to: "bob@globex.com",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
  },
];

export function getLeads() {
  return LEADS;
}

export function setLeads(leads: Lead[]) {
  LEADS = leads;
}

export function getActivity() {
  return ACTIVITY;
}

export function addActivity(a: Activity) {
  ACTIVITY.unshift(a);
}

export function getLeadById(id: string) {
  return LEADS.find((l) => l.id === id);
}

export function getEmailsByLead(leadId: string) {
  return EMAILS.filter((e) => e.leadId === leadId).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
