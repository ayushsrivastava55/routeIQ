"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedGradient } from "@/components/ui/animated-gradient";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { ArrowRight, Sparkles, Zap, Workflow, BarChart3, MessageSquare, Plug } from "lucide-react";

export default function Home() {
  return (
    <>
      <AnimatedGradient />
      <div className="space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6 pt-12"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            <Sparkles className="w-4 h-4" />
            Powered by Composio Tool Router
          </motion.div>
          
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Lead-to-Revenue
            <br />
            Automation, Simplified
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Orchestrate your CRM, email, Slack, and billing tools with intelligent routing and real-time insights. No code required.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" className="group">
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/router">
              <Button variant="outline" size="lg">
                Explore Router
              </Button>
            </Link>
          </div>
        </motion.div>

        <BentoGrid>
          <BentoCard colSpan={2}>
            <Link href="/router" className="block h-full">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Workflow className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Tool Router</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Discover, plan, and execute multi-app workflows with COMPOSIO meta tools. Dynamic orchestration at your fingertips.
                  </p>
                </div>
              </div>
            </Link>
          </BentoCard>

          <BentoCard>
            <Link href="/leads" className="block h-full">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white w-fit">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Leads</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Smart scoring and auto-assignment
                </p>
              </div>
            </Link>
          </BentoCard>

          <BentoCard>
            <Link href="/activity" className="block h-full">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white w-fit">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Activity</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Real-time action logs
                </p>
              </div>
            </Link>
          </BentoCard>

          <BentoCard colSpan={2}>
            <Link href="/apps" className="block h-full">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <Plug className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Connected Apps</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage OAuth connections to HubSpot, Slack, Stripe, DocuSign, and more. One-click authentication.
                  </p>
                </div>
              </div>
            </Link>
          </BentoCard>

          <BentoCard>
            <Link href="/chat" className="block h-full">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white w-fit">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">AI Chat</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Natural language commands
                </p>
              </div>
            </Link>
          </BentoCard>
        </BentoGrid>
      </div>
    </>
  );
}
