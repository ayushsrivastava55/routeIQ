import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">RouteIQ</h1>
      <p className="text-sm text-black/70 dark:text-white/70 max-w-2xl">
        Lead-to-Revenue automation UI powered by Composio’s Tool Router. Fixes slow
        responses, missed follow-ups, inefficient routing, and poor campaign ROI
        visibility by orchestrating CRM, ESP, comms, and billing tools.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Leads" href="/leads" desc="Filter by potential, date, status, and resend follow-ups." />
        <Card title="Activity" href="/activity" desc="Unified log of cross-tool actions and outcomes." />
        <Card title="Chatbot" href="/chat" desc="Command tools via a simple assistant (stubbed)." />
      </div>
    </div>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.03]"
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-black/70 dark:text-white/70">{desc}</div>
    </Link>
  );
}
