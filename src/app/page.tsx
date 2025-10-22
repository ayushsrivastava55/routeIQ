import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Bot } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-sm font-medium text-blue-600 dark:text-blue-400">
          <Sparkles className="w-4 h-4" />
          AI-Powered CRM Assistant
        </div>
        
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          RouteIQ
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Control your entire sales pipeline through natural language. Manage leads, send emails, create invoices, and more - all through chat.
        </p>
        
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/chat">
            <Button size="lg" className="group">
              <Bot className="w-4 h-4 mr-2" />
              Start Chatting
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/leads">
            <Button variant="outline" size="lg">
              View Leads
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
