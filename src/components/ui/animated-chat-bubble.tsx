"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedChatBubbleProps {
  children?: React.ReactNode;
  variant?: "user" | "assistant";
  isTyping?: boolean;
}

export function AnimatedChatBubble({ children, variant = "assistant", isTyping = false }: AnimatedChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl px-4 py-3 shadow-sm",
        variant === "user"
          ? "bg-primary text-primary-foreground ml-auto"
          : "bg-muted border mr-auto"
      )}
    >
      {isTyping ? (
        <div className="flex gap-1">
          <motion.div
            className="h-2 w-2 rounded-full bg-current"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-current"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-current"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
}

