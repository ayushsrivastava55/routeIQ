import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  hover?: boolean;
}

export function Card({ className, gradient, hover = true, children, ...props }: CardProps) {
  const baseStyles = "rounded-2xl border backdrop-blur-sm";
  const gradientStyles = gradient 
    ? "bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20" 
    : "bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-800";
  
  const Component = hover ? motion.div : "div";
  const motionProps = hover ? {
    whileHover: { y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" },
    transition: { duration: 0.2 }
  } : {};

  return (
    <Component
      className={cn(baseStyles, gradientStyles, className)}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-xl font-semibold text-gray-900 dark:text-gray-100", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-600 dark:text-gray-400 mt-1.5", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}
