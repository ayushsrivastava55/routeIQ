import OpenAI from "openai";

export type LeadLike = {
  email: string;
  name?: string;
  company?: string;
  source?: string;
  utm?: Record<string, any>;
  metadata?: Record<string, any>;
};

export async function scoreLeadLLM(lead: LeadLike): Promise<{ score: number; reasons: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { score: 0, reasons: ["OPENAI_API_KEY not set"] };
  const client = new OpenAI({ apiKey });
  const prompt = `You are scoring lead quality from 0 to 100.
Input:
- Email: ${lead.email}

export async function generateWelcomeEmail(lead: LeadLike): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { subject: "Welcome to RouteIQ", body: `Hi ${lead.name || "there"},\n\nThanks for signing up. We're excited to help automate your lead-to-revenue ops.\n\nBest,\nTeam` };
  const client = new OpenAI({ apiKey });
  const sys = "You write concise, friendly product emails. Return strict JSON with subject and body.";
  const user = `Lead: ${lead.name || lead.email} at ${lead.company || "-"}. Craft a short welcome email.`;
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [ { role: "system", content: sys }, { role: "user", content: user } ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });
  try {
    const content = res.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content as string);
    return { subject: String(parsed.subject || "Welcome"), body: String(parsed.body || "Hello!") };
  } catch {
    return { subject: "Welcome", body: "Hello!" };
  }
}

export async function generateReengageEmail(lead: LeadLike): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { subject: "Quick nudge", body: `Hi ${lead.name || "there"},\n\nCircling back to see if you had a chance to review. Happy to help.\n\nBest,\nTeam` };
  const client = new OpenAI({ apiKey });
  const sys = "You write short re-engagement emails with a single CTA. Return subject and body as JSON.";
  const user = `Lead: ${lead.name || lead.email} at ${lead.company || "-"}. Write a brief re-engagement note.`;
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [ { role: "system", content: sys }, { role: "user", content: user } ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });
  try {
    const content = res.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content as string);
    return { subject: String(parsed.subject || "Quick check-in"), body: String(parsed.body || "Hello") };
  } catch {
    return { subject: "Quick check-in", body: "Hello" };
  }
}

export async function summarizeWeeklyReport(metrics: Record<string, any>): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseline = `Weekly summary:\n- Emails sent: ${metrics.emailsSent}\n- Engaged: ${metrics.engaged}\n- Resends: ${metrics.resends}`;
  if (!apiKey) return baseline;
  const client = new OpenAI({ apiKey });
  const sys = "You summarize CRM/marketing metrics into a 3-5 bullet digest. Output plain text.";
  const user = `Metrics JSON: ${JSON.stringify(metrics)}`;
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [ { role: "system", content: sys }, { role: "user", content: user } ],
    temperature: 0.3,
  });
  return (res.choices?.[0]?.message?.content as string) || baseline;
}
- Name: ${lead.name || ""}
- Company: ${lead.company || ""}
- Source: ${lead.source || ""}
- UTM: ${JSON.stringify(lead.utm || {})}
- Metadata: ${JSON.stringify(lead.metadata || {})}
Rules of thumb:
- Business domains > free mail get +15
- Pricing/demo/contact intent +10
- Known company or non-empty company +10
Return JSON {"score": number(0-100), "reasons": string[]} only.`;
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a precise lead scorer. Return strict JSON only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  });
  const content = res.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content as string);
    const s = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [];
    return { score: s, reasons };
  } catch {
    return { score: 0, reasons: ["Failed to parse model response"] };
  }
}
