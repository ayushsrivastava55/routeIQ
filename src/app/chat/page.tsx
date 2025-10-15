"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Lead } from "@/lib/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: crypto.randomUUID(),
    role: "assistant",
    content: "Hi! I can notify Slack, send/resend emails, and create invoices. Try: 'resend L-1001' or 'invoice L-1002 500'.",
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Chatbot</h1>
      <div className="border rounded border-black/10 dark:border-white/10">
        <div ref={listRef} className="h-[380px] overflow-auto p-3 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div className={`inline-block max-w-[75%] rounded px-3 py-2 ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-black/5 dark:bg-white/10"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 p-2 border-t border-black/10 dark:border-white/10"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!input.trim()) return;
            const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input, timestamp: new Date().toISOString() };
            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            const reply = await handleCommand(userMsg.content);
            setMessages((prev) => [...prev, reply]);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border rounded px-3 py-2"
          />
          <button className="px-3 py-2 rounded border hover:bg-black/[.03] dark:hover:bg-white/[.07]">Send</button>
        </form>
      </div>
      <div className="text-xs opacity-70">Commands: resend [LEAD_ID], notify [LEAD_ID], invoice [LEAD_ID] [AMOUNT]</div>
    </div>
  );
}

async function handleCommand(input: string): Promise<ChatMessage> {
  const text = input.trim();
  const lower = text.toLowerCase();
  try {
    if (lower.startsWith("resend ")) {
      const id = text.split(/\s+/)[1];
      const res = await fetch(`/api/leads/${id}/resend`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to resend");
      const data = await res.json();
      return makeAssistant(`Resent follow-up: ${data.activity?.message ?? "ok"}`);
    }

    if (lower.startsWith("notify ")) {
      const id = text.split(/\s+/)[1];
      const lead = await findLead(id);
      if (!lead) throw new Error("Lead not found");
      // Just log activity for demo
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "slack_notified",
          leadId: lead.id,
          message: `Notified #sales about ${lead.name}`,
          status: "success",
        }),
      });
      return makeAssistant(`Slack notified for ${lead.name}`);
    }

    if (lower.startsWith("invoice ")) {
      const parts = text.split(/\s+/);
      const id = parts[1];
      const amount = Number(parts[2]);
      if (!Number.isFinite(amount)) throw new Error("Amount required");
      const lead = await findLead(id);
      if (!lead) throw new Error("Lead not found");
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invoice_created",
          leadId: lead.id,
          message: `Invoice created for ${lead.name} - $${amount}`,
          status: "success",
          meta: { amount },
        }),
      });
      return makeAssistant(`Invoice created: $${amount} for ${lead.name}`);
    }

    return makeAssistant("Sorry, I didn’t understand. Try: resend L-1001 | notify L-1001 | invoice L-1002 500");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return makeAssistant(`Error: ${msg}`);
  }
}

async function findLead(id: string): Promise<Lead | undefined> {
  const res = await fetch("/api/leads");
  const data = await res.json();
  const leads: Lead[] = data.leads;
  return leads.find((l) => l.id === id);
}

function makeAssistant(content: string): ChatMessage {
  return { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date().toISOString() };
}
