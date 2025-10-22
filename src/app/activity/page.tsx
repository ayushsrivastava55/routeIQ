"use client";

import { useEffect, useState } from "react";
import type { Activity } from "@/lib/types";
import { CheckCircle2, XCircle, Clock, Mail, MessageSquare, DollarSign, FileText, User } from "lucide-react";

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setItems(d.activity || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Activity Feed</h1>
        <p className="text-muted-foreground">Track all actions across your sales pipeline</p>
      </div>

      <div className="border rounded-lg bg-card">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-3 animate-spin" />
            <p>Loading activity...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-2">Your recent actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((a) => (
              <div key={a.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    a.status === "success" ? "bg-green-100 dark:bg-green-900/20" :
                    a.status === "error" ? "bg-red-100 dark:bg-red-900/20" :
                    "bg-yellow-100 dark:bg-yellow-900/20"
                  }`}>
                    {a.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : a.status === "error" ? (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold capitalize">{formatType(a.type)}</span>
                      {a.leadId && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {a.leadId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{a.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatType(t: string) {
  return t.replaceAll("_", " ");
}
