
Here’s the quickest path to get leads from your CRM via Composio (no local fallb
ack).

Prereqs
- Composio account + API key.
- A connected HubSpot (or your CRM) account in Composio.
- Node env set up for the app.

Configure Composio
- Add env vars in `/.env.local`:
  - `COMPOSIO_API_KEY=your_composio_api_key`
  - `COMPOSIO_CRM_ACCOUNT_ID=conn_xxx` (optional, HubSpot connected account id for `/api/leads`)
  - `COMPOSIO_CRM_TOOLKIT=hubspot` (optional, defaults to `hubspot`)
- Connect your HubSpot account in Composio (per docs):
  - Read: https://docs.composio.dev/toolkits/introduction.md
  - HubSpot specifics: https://docs.composio.dev/toolkits/hubspot.md
  - Ensure the connection has access to Contacts (and optionally Owners/Companie
s).

Wire the CRM in code
- We’ve wired `src/lib/composioClient.ts` to use the official Composio SDK and `tools.proxyExecute` when `COMPOSIO_API_KEY` is set.
- To enable CRM-backed leads, provide `COMPOSIO_CRM_ACCOUNT_ID` (from the Apps page after connecting HubSpot) and optionally `COMPOSIO_CRM_TOOLKIT`.
- For deeper control, you can extend the three functions in `src/lib/composioClient.ts` under `crm`:
  - `listLeads(q)`
  - `getLeadById(id)`
  - `assignOwner(id, owner)` (left unimplemented; map your owner codes to CRM owner ids and PATCH contact)
- Use the Composio HubSpot toolkit to:
  - List contacts with properties you need (email, firstname, lastname, hs_lead_
score, lifecycle stage, lastmodifieddate, company, owner).
  - Map each contact to our `Lead` shape.
  - Optionally call Owners/Companies endpoints to hydrate `owner` and `company`.
  - Apply filters from `q` either in HubSpot query or post-filter in code.
- Notes:
  - Keep return type: array of `Lead` from `src/lib/types.ts`.
  - Our API now throws 501 if these aren’t implemented or Composio isn’t configu
red.

Field mapping guide
- id: HubSpot contact id.
- name: `firstname` + `lastname` (fallback to `email` username).
- email: `email`.
- company: linked company name (if available) or contact property.
- potential: map from `hs_lead_score` (cap 0–100) or your heuristic.
- status: map lifecycle/deal stage → one of `new | contacted | waiting_reply | q
ualified | won | lost`.
- owner: resolve HubSpot owner id to a short name if desired.
- createdAt: contact `createdAt` (ISO).
- lastContactAt: `lastmodifieddate` or last engagement time (ISO).

Verify locally
- Start the app: `npm run dev`
- Hit `GET /api/leads`:
  - Expect 200 with `{ leads: [...] }` when `COMPOSIO_API_KEY` and `COMPOSIO_CRM_ACCOUNT_ID` are set.
  - If you see 501 with “CRM not configured…”, set the env vars or wire your CRM owner assignment if calling `/api/leads/assign`.
- Frontend:
  - Go to `/leads`. The table should render your CRM contacts. If API errors, the page will show empty (no crash).

Troubleshooting
- 501 from `/api/leads`: Set `COMPOSIO_API_KEY` and `COMPOSIO_CRM_ACCOUNT_ID` (from `/apps` after connecting HubSpot).
- Owner assignment (`POST /api/leads/assign`) requires `crm.assignOwner` implementation. If not supported in your CRM plan, you can no-op or return 501.
