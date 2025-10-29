# Resend Email Body Fetching Implementation

## Overview

Resend inbound webhooks **do not include email body content** by default. This implementation fetches the full email content (HTML/text) from Resend's API in the background after receiving the webhook notification.

## How It Works

### Flow Diagram

```
1. Resend Webhook → POST /inbound
   ↓
2. Insert email metadata immediately (from, to, subject, email_id)
   ↓
3. Return 200 OK (webhook responds fast)
   ↓
4. Schedule background fetch action
   ↓
5. Fetch email body from Resend API (GET /emails/receiving/{email_id})
   ↓
6. Update email record with html/text body
   ↓
7. UI shows body (via reactivity)
```

### Implementation Details

**File: `convex/http.ts`**
- Webhook handler extracts `email_id` from payload
- Schedules `fetchResendBody` action immediately (0ms delay)
- Returns 200 OK without waiting for body fetch

**File: `convex/emails.ts`**
- `fetchResendBody` (internal action): Calls Resend API to get full email
- `applyFetchedBody` (internal mutation): Updates email record with body
- `markBodyFetchFailed` (internal mutation): Logs errors for failed fetches

### Retry Strategy

**Exponential Backoff:**
- Attempt 1: Immediate
- Attempt 2: 10 seconds
- Attempt 3: 30 seconds  
- Attempt 4: 60 seconds
- Attempt 5: 5 minutes

**Retryable Errors:**
- 404 (Not Found - email not ready yet)
- 429 (Rate Limited)
- 5xx (Server Errors)
- Network errors

**Non-Retryable Errors:**
- 401 (Unauthorized - bad API key)
- 403 (Forbidden)
- 400 (Bad Request)

After 5 failed attempts, the error is logged and retries stop.

## Configuration

### Environment Variables

Set in Convex environment:

```bash
npx convex env set RESEND_API_KEY re_xxxxxxxxxxxxxxxxxx
```

**Note:** This must be your Resend API key with permissions to access the receiving emails API.

### Resend Dashboard Setup

1. Go to Resend Dashboard → Inbound
2. Configure webhook: `https://YOUR-DEPLOYMENT.convex.site/inbound`
3. Enable webhook (email content is NOT required in webhook payload)
4. Verify domain and MX records

## API Details

### Resend API Endpoint

```
GET https://api.resend.com/emails/receiving/{email_id}
Authorization: Bearer {RESEND_API_KEY}
```

### Response Format

```json
{
  "id": "be66d4ac-b510-48a1-9be7-3b133b1a63ec",
  "from": "sender@example.com",
  "to": ["recipient@example.com"],
  "subject": "Email subject",
  "html": "<p>HTML body content</p>",
  "text": "Plain text body content",
  "created_at": "2025-10-23T16:04:04.575853+00:00",
  "attachments": []
}
```

### Fields Used

- `html` or `html_body`: HTML body content (preferred)
- `text` or `text_body`: Plain text body content (fallback)
- Body priority: `html > html_body > text > text_body > ""`

## User Experience

### Timeline

1. **T+0ms**: User sends email to your Resend inbound address
2. **T+500ms**: Resend webhook arrives → email appears in inbox with metadata only
3. **T+500ms - T+2s**: Background fetch retrieves body from Resend API
4. **T+2s**: Email body appears in UI automatically (Convex reactive updates)

### UI Behavior

- Email appears immediately with **subject, sender, preview** (may be empty)
- Body loads within 1-2 seconds (usually imperceptible)
- If user clicks email before body loads, they'll see a brief empty state
- Convex reactivity automatically updates UI when body arrives

### Edge Cases

**Body fetch fails after 5 retries:**
- Email remains in inbox with metadata
- Body field stays empty
- Error logged to Convex logs
- User sees empty body (consider showing "Failed to load email content" in UI)

**Duplicate webhook delivery:**
- Idempotency on `messageId` prevents duplicate emails
- Only one fetch scheduled per email
- `applyFetchedBody` checks if body already exists before updating

**Race condition (body loads before user opens email):**
- Most common case
- User sees complete email immediately

## Monitoring

### Convex Logs

Check for these log messages:

**Success:**
```
(no logs on success - silent operation)
```

**Errors:**
```
Failed to fetch body for email {id} after {attempt} attempts: {error}
Resend fetch failed (404), retrying in 10s (attempt 1)
RESEND_API_KEY not set, cannot fetch email body
Error fetching Resend body for {emailId}: {error}
```

### Debugging

**Email has no body:**
1. Check Convex logs for `fetchResendBody` errors
2. Verify `RESEND_API_KEY` is set: `npx convex env get RESEND_API_KEY`
3. Test API key manually:
   ```bash
   curl https://api.resend.com/emails/receiving/EMAIL_ID \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
4. Check if Resend API returned the email (could be 404 if email was deleted)

**Body fetch is slow:**
- Check Convex logs for retry messages
- Verify Resend API latency in their status page
- Consider if rate limits are being hit (429 errors)

## Testing

### Manual Test with curl

```bash
# Simulate Resend webhook
curl -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "created_at": "2025-10-23T16:03:49.000Z",
    "type": "email.received",
    "data": {
      "email_id": "test-email-id-123",
      "from": "test@example.com",
      "to": ["you@yourdomain.com"],
      "subject": "Test Email",
      "message_id": "<test-123@mail.example.com>",
      "created_at": "2025-10-23 16:04:04.575853+00",
      "attachments": []
    }
  }'
```

**Expected:**
- 200 OK response immediately
- Email appears in Convex database with metadata
- Background action scheduled
- **Note:** Body fetch will fail with 404 because email_id doesn't exist in Resend

### Real Email Test

1. Send email to your Resend inbound address
2. Check inbox UI - email should appear within 1-2 seconds
3. Click email - body should be visible
4. Check Convex logs for any errors

## Performance

### Webhook Response Time
- **Target:** < 500ms
- **Actual:** ~100-300ms (just metadata insert)

### Body Fetch Time
- **Resend API latency:** ~200-800ms
- **Total time to body in UI:** ~500ms - 2s
- **Retry with backoff:** Up to 6 minutes (if Resend API is slow/failing)

### Database Impact
- Initial insert: 1 write operation
- Body update: 1 patch operation
- Total: 2 writes per email

## Future Enhancements

### Option 1: Eager UI with Loading State

Show "Loading email content..." in UI while body is fetching:

```typescript
{email.body ? (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }} />
) : (
  <div className="text-muted-foreground">Loading email content...</div>
)}
```

### Option 2: Fetch Attachments

Extend `fetchResendBody` to also fetch and store attachment metadata:

```typescript
const attachments = data?.attachments || [];
await ctx.db.patch(id, { 
  body, 
  preview, 
  attachments: JSON.stringify(attachments) 
});
```

### Option 3: Store Fetch Status

Add schema field to track fetch status:

```typescript
bodyFetchStatus: v.optional(v.union(
  v.literal("pending"),
  v.literal("complete"),
  v.literal("failed")
)),
```

### Option 4: Manual Retry Button

Add UI button to retry failed body fetches:

```typescript
export const retryBodyFetch = mutation({
  args: { id: v.id("emails"), emailId: v.string() },
  handler: async (ctx, { id, emailId }) => {
    // Trigger fetchResendBody action again
  },
});
```

## Comparison to Alternative Approaches

### Alternative 1: Include Body in Webhook
**Pros:** No extra API call, instant body  
**Cons:** Resend doesn't support this option

### Alternative 2: Fetch on Demand (when user opens email)
**Pros:** Only fetch bodies for emails that are read  
**Cons:** Slower UX, complex client-side logic, needs API key exposure or backend endpoint

### Alternative 3: Polling
**Pros:** Simpler implementation  
**Cons:** Inefficient, high latency, wastes API quota

**Chosen Approach (Background Fetch with Scheduling):**
- ✅ Fast webhook response
- ✅ Automatic background processing
- ✅ Built-in retry logic
- ✅ Convex scheduler handles concurrency
- ✅ No extra infrastructure needed

## References

- [Resend Receiving Emails Docs](https://resend.com/docs/dashboard/receiving/introduction)
- [Resend API Reference - Get Received Email](https://resend.com/docs/api-reference/emails/retrieve-received-email)
- [Convex Actions](https://docs.convex.dev/functions/actions)
- [Convex Scheduling](https://docs.convex.dev/scheduling/scheduled-functions)
- [Migration Plan](./RESEND_MIGRATION.md)
