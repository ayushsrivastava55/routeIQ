import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {children}
    </div>
  );
}

export function BentoCard({
  children,
  className,
  colSpan = 1,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
}) {
  const spanClass = {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
  }[colSpan];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-2xl transition-all duration-300",
        spanClass,
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
