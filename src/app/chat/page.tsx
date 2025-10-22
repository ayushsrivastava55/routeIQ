"use client";

import { Send, Bot, User, Sparkles, Plus, Wrench, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholdersInput } from "@/components/ui/placeholders-input";
import { AnimatedDialog } from "@/components/ui/animated-dialog";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ToolCall = {
  id: string;
  name: string;
  args: any;
  result?: any;
  status: "pending" | "executing" | "completed" | "error";
  timestamp: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
};

export default function ChatPage() {
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const [connectionDialog, setConnectionDialog] = useState<{
    visible: boolean;
    toolkit?: string;
    authConfigId?: string;
  }>({ visible: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("routeiq_userId") || "";
    if (u) setUserId(u);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!userId) {
      // Require a user id instead of using a hardcoded fallback
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Please enter your email (user id) to start chatting." },
      ]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);
    setActiveToolCalls([]);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          messages: [...messages, userMessage],
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolCalls: [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const currentToolCalls = new Map<string, ToolCall>();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep incomplete

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const evt = JSON.parse(line.slice(6));
                
                if (evt.type === "text-delta" && typeof evt.delta === "string") {
                  fullContent += evt.delta;
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantId ? { ...msg, content: fullContent } : msg))
                  );
                } else if (evt.type === "tool-call") {
                  const tc: ToolCall = {
                    id: evt.toolCallId || `${Date.now()}_${Math.random()}`,
                    name: evt.toolName || "tool",
                    args: evt.args || {},
                    status: "executing",
                    timestamp: Date.now(),
                  };
                  currentToolCalls.set(tc.id, tc);
                  setActiveToolCalls(Array.from(currentToolCalls.values()));
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, toolCalls: Array.from(currentToolCalls.values()) }
                        : msg
                    )
                  );
                } else if (evt.type === "tool-result") {
                  const existing = currentToolCalls.get(evt.toolCallId);
                  if (existing) {
                    existing.result = evt.result;
                    existing.status = "completed";
                    currentToolCalls.set(existing.id, existing);
                    setActiveToolCalls(Array.from(currentToolCalls.values()));
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantId
                          ? { ...msg, toolCalls: Array.from(currentToolCalls.values()) }
                          : msg
                      )
                    );
                  }
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setActiveToolCalls([]);
    }
  };

  const connectTool = async (toolkit: string, authConfigId: string) => {
    const res = await fetch("/api/apps/connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authConfigId, userId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank");
        setConnectionDialog({ visible: false });
      }
    }
  };

  const placeholders = [
    "Show me all qualified leads",
    "Send an email to a lead",
    "Create an invoice for $5000",
    "What tools are available?",
    "Find leads with score above 80",
    "Show my activity feed",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI CRM Assistant</h1>
            <p className="text-muted-foreground text-sm">
              Control your entire sales pipeline through natural language
            </p>
          </div>
        </div>

        {!userId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex items-center gap-3">
              <input
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  localStorage.setItem("routeiq_userId", e.target.value);
                }}
                placeholder="Enter your email address"
                className="flex-1 border rounded px-3 py-2 bg-background text-sm"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Required
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat Messages Container - FIXED SCROLLING */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 rounded-xl border bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6 space-y-4"
        style={{ minHeight: 0 }} // This is crucial for flex scrolling
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
            >
              <Bot className="h-12 w-12 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-semibold mb-2">Welcome to RouteIQ!</h2>
              <p className="text-muted-foreground max-w-md">
                I'm your AI-powered CRM assistant. I can help you manage leads, send emails,
                create invoices, and more.
              </p>
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={cn(
                "flex gap-3 items-start",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-md"
                >
                  <Bot className="h-4 w-4 text-white" />
                </motion.div>
              )}

              <div
                className={cn(
                  "flex flex-col gap-2 max-w-[80%]",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    message.role === "user"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </motion.div>

                {/* Tool Calls Display */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="flex flex-col gap-1 w-full">
                    {message.toolCalls.map((toolCall) => (
                      <motion.div
                        key={toolCall.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs"
                      >
                        {toolCall.status === "executing" && (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        )}
                        {toolCall.status === "completed" && (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        )}
                        {toolCall.status === "pending" && (
                          <Wrench className="h-3 w-3 text-gray-600" />
                        )}
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          {toolCall.name}
                        </span>
                        {toolCall.args && (
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-xs">
                            {JSON.stringify(toolCall.args).substring(0, 50)}
                            {JSON.stringify(toolCall.args).length > 50 ? "..." : ""}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-md"
                >
                  <User className="h-4 w-4 text-white" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 items-start"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 border px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-slate-400"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
          ))}
        </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - FIXED AT BOTTOM */}
      <div className="flex-shrink-0">
        <PlaceholdersInput
          placeholders={placeholders}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSubmit}
            value={input}
          disabled={isLoading}
        />
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground justify-center">
          <span>💡 Natural language</span>
          <span>•</span>
          <span>⚡ Real-time</span>
          <span>•</span>
          <span>🎯 Full CRM control</span>
        </div>
      </div>

      {/* Connection Dialog */}
      <AnimatedDialog
        open={connectionDialog.visible}
        onClose={() => setConnectionDialog({ visible: false })}
        title="Connect Tool"
        description={`The AI needs access to ${connectionDialog.toolkit} to help you. Would you like to connect it now?`}
      >
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (connectionDialog.toolkit && connectionDialog.authConfigId) {
                connectTool(connectionDialog.toolkit, connectionDialog.authConfigId);
              }
            }}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect
          </Button>
          <Button
            variant="outline"
            onClick={() => setConnectionDialog({ visible: false })}
            className="flex-1"
          >
            Later
          </Button>
        </div>
      </AnimatedDialog>

      {/* Floating Tool Call Panel - Real-time visualization */}
      <AnimatePresence>
        {activeToolCalls.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-8 w-96 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3 border-b pb-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Active Tool Calls
              </h3>
              <span className="ml-auto text-xs text-slate-500">
                {activeToolCalls.length} running
              </span>
            </div>
            <div className="space-y-2">
              {activeToolCalls.map((toolCall) => (
                <motion.div
                  key={toolCall.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {toolCall.status === "executing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {toolCall.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {toolCall.status === "pending" && (
                      <Wrench className="h-4 w-4 text-gray-600 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                        {toolCall.name}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          toolCall.status === "executing" &&
                            "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
                          toolCall.status === "completed" &&
                            "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                          toolCall.status === "pending" &&
                            "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {toolCall.status}
                      </span>
                    </div>
                    {toolCall.args && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {JSON.stringify(toolCall.args)}
                      </p>
                    )}
                    {toolCall.result && toolCall.status === "completed" && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-green-700 dark:text-green-400 mt-1 truncate"
                      >
                        ✓ Completed
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
