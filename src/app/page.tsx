import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
          Welcome to RouteIQ
        </h1>
        <p className="text-lg max-w-3xl" style={{ color: 'var(--foreground-muted)' }}>
          Lead-to-Revenue automation powered by Composio. Orchestrate your CRM, email, Slack, and billing tools with intelligent routing and real-time insights.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground-muted)' }}>
          Core Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card 
            title="Leads" 
            href="/leads" 
            desc="Browse, filter, and manage your leads with smart potential scoring and owner assignment."
            icon="📊"
          />
          <Card 
            title="Activity Feed" 
            href="/activity" 
            desc="Real-time log of all actions across HubSpot, Gmail, Slack, Stripe, and DocuSign."
            icon="📝"
          />
          <Card 
            title="AI Assistant" 
            href="/chat" 
            desc="Natural language commands to resend emails, notify Slack, or create invoices instantly."
            icon="💬"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground-muted)' }}>
          Analytics & Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card 
            title="Admin Dashboard" 
            href="/admin" 
            desc="Response times, conversion rates, and status distribution at a glance."
            icon="📈"
          />
          <Card 
            title="Marketing Metrics" 
            href="/marketing" 
            desc="Email engagement trends, campaign performance, and lead generation insights."
            icon="📧"
          />
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, href, icon }: { title: string; desc: string; href: string; icon: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-xl p-6 transition-all hover:shadow-lg"
      style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-lg group-hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--foreground)' }}>
            {title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}
