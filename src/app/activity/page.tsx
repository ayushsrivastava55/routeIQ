"use client";

import { useEffect, useState } from "react";
import type { Activity } from "@/lib/types";

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setItems(d.activity))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Activity</h1>
      <div className="border rounded p-3 border-black/10 dark:border-white/10">
        {loading ? (
          <div className="py-6 text-center opacity-70">Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center opacity-70">No activity yet</div>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span className={`mt-1 h-2 w-2 rounded-full ${
                    a.status === "success"
                      ? "bg-green-500"
                      : a.status === "error"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }`} />
                <div>
                  <div className="text-sm">
                    <span className="font-medium">{formatType(a.type)}</span>
                    {a.leadId ? (
                      <span className="opacity-70"> · {a.leadId}</span>
                    ) : null}
                    <span className="opacity-70"> · {new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-sm opacity-80">{a.message}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatType(t: string) {
  return t.replaceAll("_", " ");
}
