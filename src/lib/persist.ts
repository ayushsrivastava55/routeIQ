import fs from "fs";
import path from "path";
import type { Activity, Email, Lead } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "activity.json");
const EMAILS_FILE = path.join(DATA_DIR, "emails.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  ensureDir();
  if (!fs.existsSync(file)) return fallback;
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, data: T) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export function loadLeads(): Lead[] {
  return readJson<Lead[]>(LEADS_FILE, defaultLeads());
}
export function saveLeads(leads: Lead[]) {
  writeJson(LEADS_FILE, leads);
}

export function loadActivity(): Activity[] {
  return readJson<Activity[]>(ACTIVITY_FILE, []);
}
export function pushActivity(a: Activity) {
  const existing = loadActivity();
  existing.unshift(a);
  writeJson(ACTIVITY_FILE, existing);
}

export function loadEmails(): Email[] {
  return readJson<Email[]>(EMAILS_FILE, defaultEmails());
}
export function emailsByLead(leadId: string): Email[] {
  return loadEmails()
    .filter((e) => e.leadId === leadId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function leadById(id: string): Lead | undefined {
  return loadLeads().find((l) => l.id === id);
}

function defaultLeads(): Lead[] {
  return [
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
}

function defaultEmails(): Email[] {
  return [
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
}

