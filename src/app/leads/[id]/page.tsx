"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageSquare, DollarSign, CheckCircle, XCircle, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/types";
import { motion } from "framer-motion";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.id as string;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    
    fetch(`/api/leads/${leadId}`)
      .then(r => r.json())
      .then(data => {
        setLead(data.lead);
        setEditedLead(data.lead);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leadId]);

  const updateStatus = async (status: string) => {
    if (!lead) return;
    setUpdating(true);
    
    try {
      const res = await fetch(`/api/leads/${leadId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const saveChanges = async () => {
    if (!lead) return;
    setUpdating(true);
    
    try {
      const res = await fetch(`/api/leads/${leadId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedLead),
      });
      
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
    } finally {
      setUpdating(false);
    }
  };

  const sendEmail = async () => {
    if (!lead) return;
    
    const userId = localStorage.getItem("routeiq_userId") || "demo";
    const res = await fetch(`/api/leads/${leadId}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    
    if (res.ok) {
      alert("Email sent successfully!");
    }
  };

  const markAsWon = async () => {
    if (!lead) return;
    
    const revenue = prompt("Enter deal value:", lead.potential?.toString() || "5000");
    if (!revenue) return;
    
    const userId = localStorage.getItem("routeiq_userId") || "demo";
    const res = await fetch("/api/deals/won", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        userId,
        revenue: parseFloat(revenue),
      }),
    });
    
    if (res.ok) {
      await updateStatus("won");
      alert(`Deal won! Revenue: $${revenue}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Lead not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        <div>
            <h1 className="text-3xl font-bold">{lead.name}</h1>
            <p className="text-muted-foreground">{lead.email}</p>
          </div>
        </div>
        
        {!editing ? (
          <Button onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setEditing(false);
              setEditedLead(lead);
            }}>
              Cancel
            </Button>
            <Button onClick={saveChanges} disabled={updating}>
              <Save className="h-4 w-4 mr-2" />
              {updating ? "Saving..." : "Save"}
            </Button>
        </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold mb-4">Lead Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedLead.name || ""}
                    onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                ) : (
                  <div className="mt-1 font-medium">{lead.name}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={editedLead.email || ""}
                    onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                ) : (
                  <div className="mt-1 font-medium">{lead.email}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Company</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedLead.company || ""}
                    onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                ) : (
                  <div className="mt-1 font-medium">{lead.company || "-"}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedLead.phone || ""}
                    onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                ) : (
                  <div className="mt-1 font-medium">{lead.phone || "-"}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Owner</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedLead.owner || ""}
                    onChange={(e) => setEditedLead({ ...editedLead, owner: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                ) : (
                  <div className="mt-1 font-medium">{lead.owner || "Unassigned"}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Lead Score</label>
                <div className="mt-1">
                  <ScoreBadge score={lead.potential} />
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              {editing ? (
                <textarea
                  value={editedLead.notes || ""}
                  onChange={(e) => setEditedLead({ ...editedLead, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  rows={4}
                />
              ) : (
                <div className="mt-1 text-muted-foreground">{lead.notes || "No notes"}</div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm text-muted-foreground">Created</label>
                <div className="mt-1">{new Date(lead.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Last Contact</label>
                <div className="mt-1">{lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString() : "Never"}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Actions & Status */}
        <div className="space-y-6">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">Status</h2>
            
            <StatusBadge status={lead.status} large />
            
            <div className="space-y-2 pt-4 border-t">
              <button
                onClick={() => updateStatus("contacted")}
                disabled={updating || lead.status === "contacted"}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md text-sm font-medium transition-colors"
              >
                Mark as Contacted
              </button>
              
              <button
                onClick={() => updateStatus("qualified")}
                disabled={updating || lead.status === "qualified"}
                className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-md text-sm font-medium transition-colors"
              >
                Mark as Qualified
              </button>
              
              <button
                onClick={markAsWon}
                disabled={updating || lead.status === "won"}
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark as Won
              </button>
              
              <button
                onClick={() => updateStatus("lost")}
                disabled={updating || lead.status === "lost"}
                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Mark as Lost
              </button>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            
            <div className="space-y-2">
              <button
                onClick={sendEmail}
                className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </button>
              
              <button
                onClick={() => router.push(`/chat?leadId=${leadId}`)}
                className="w-full px-4 py-2 border hover:bg-muted rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat with AI
              </button>
              
              <button
                onClick={() => {
                  const userId = localStorage.getItem("routeiq_userId") || "demo";
                  const text = `Lead Update: ${lead.name} (${lead.company || "No company"}) - Status: ${lead.status}`;
                  fetch("/api/notify/slack", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, text }),
                  });
                  alert("Slack notification sent!");
                }}
                className="w-full px-4 py-2 border hover:bg-muted rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Notify on Slack
              </button>
            </div>
          </motion.div>

          {/* Revenue Info */}
          {lead.potential && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Revenue Potential</h2>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">${lead.potential.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Estimated value</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    new: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", label: "New" },
    contacted: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", label: "Contacted" },
    waiting_reply: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Waiting Reply" },
    qualified: { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", label: "Qualified" },
    won: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", label: "Won" },
    lost: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", label: "Lost" },
  };
  
  const config = statusConfig[status] || statusConfig.new;
  const sizeClass = large ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs";
  
  return (
    <span className={`inline-flex items-center rounded-full font-semibold capitalize ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 85) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    if (s >= 70) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (s >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getColor(score)}`}>
      {score}/100
    </span>
  );
}
