// Simple in-memory store for demo purposes.
// Resets on server restart. Replace with DB in production.

import type { Activity, Lead } from "@/lib/types";

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
