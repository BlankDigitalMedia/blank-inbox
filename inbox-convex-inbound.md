## Inbox MVP: Convex + inbound.new

### Overview
- Replace placeholder emails with Convex-backed data
- Receive emails via inbound.new webhook (single catch-all)
- Keep UI; implement list/detail, toggle star, mark read

### Files
- `convex/schema.ts` — emails table + index
- `convex/emails.ts` — queries: `list`, `get`; mutations: `toggleStar`, `markRead`, `upsertFromInbound` (internal)
- `convex/http.ts` — HTTP router, POST `/inbound` → `upsertFromInbound`
- `lib/convex-provider.tsx` — Convex React client/provider
- `app/layout.tsx` — wraps app with `ConvexProvider`
- `components/inbox-view.tsx` — uses Convex queries/mutations, removes mock data

### Data model
```ts
// convex/schema.ts (excerpt)
emails: defineTable({
  from: v.string(),
  to: v.optional(v.string()),
  subject: v.string(),
  preview: v.string(),
  body: v.string(),
  read: v.boolean(),
  starred: v.boolean(),
  receivedAt: v.number(),
  messageId: v.optional(v.string()),
  threadId: v.optional(v.string()),
  category: v.optional(v.string()),
}).index("by_receivedAt", ["receivedAt"])
```

### Webhook (receiving)
- Route registered in `convex/http.ts`:
  - Method: POST
  - Path: `/inbound`
- IMPORTANT: Convex HTTP endpoints are served from the `.convex.site` domain.
  - Use: `https://<deployment>.convex.site/inbound`
  - Example: `https://knowing-reindeer-729.convex.site/inbound`
- inbound.new should POST to that URL.

Minimal test (should return 200):
```bash
curl -i -X POST https://knowing-reindeer-729.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from":"Tester <test@example.com>",
    "to":"you@example.com",
    "subject":"Hello from curl",
    "text":"This is a test body",
    "messageId":"curl-test-123",
    "date":"2025-10-19T20:59:00Z"
  }'
```

### Frontend wiring
- `components/inbox-view.tsx` uses:
  - `useQuery(api.emails.list)` to load emails (sorted by `receivedAt` desc)
  - `useMutation(api.emails.toggleStar)` and `useMutation(api.emails.markRead)` for actions
- UI stays the same (shadcn components), mock data removed.

### Env vars
- `NEXT_PUBLIC_CONVEX_URL` — set by `convex dev` in `.env.local`
- `CONVEX_DEPLOYMENT` — set by `convex dev`
- `NEXT_INBOUND_API_KEY` — inbound.new API key (sending optional for later)

### Run locally
```bash
# push schema, generate types once
npx convex dev --once

# then run Next.js dev server as usual
npm run dev
```

### Configure inbound.new (MVP)
- Create a single catch-all endpoint pointing to `https://<deployment>.convex.site/inbound`
- Docs: [inbound.new Quickstart](https://docs.inbound.new/)

### Troubleshooting
- 404 from webhook: ensure you’re posting to `.convex.site` (not `.convex.cloud`) and the path is `/inbound`.
- Email not listed: verify table `emails` has rows; check Convex dashboard or run `useQuery(api.emails.list)` in UI.
- Insert idempotency: `messageId` is used to avoid duplicates when present.

### References
- Convex HTTP actions and router: https://docs.convex.dev/functions/http-actions
- Convex server API (HTTP actions): https://github.com/get-convex/convex-js/blob/main/api-extractor-configs/reports/server.api.md
- inbound.new docs: https://docs.inbound.new/


