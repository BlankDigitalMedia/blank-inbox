# Migration Plan: inbound.new → Resend Inbound API

**Date:** Oct 23, 2025  
**Status:** Planning  
**Estimated Effort:** 4–10 hours (full migration including sending)

---

## Executive Summary

**Complexity:** Medium-Large  
**Risk Level:** Medium (manageable with proper testing)  
**Recommended Approach:** Phased migration with dual-format webhook parsing for zero-downtime cutover

### Effort Breakdown
- **Inbound-only (webhook receiving):** 2–6 hours
- **Full migration (receiving + sending):** 4–10 hours  
- **Webhook signature verification:** 0.5–2 hours (optional but recommended)
- **Attachments support:** 2–8 hours (future enhancement)

---

## Complete Change List

### 1. Package Dependencies (`package.json`)

**Remove:**
```json
"@inboundemail/sdk": "^4.3.0"
```

**Add:**
```json
"resend": "^6.x"
```

**Command:**
```bash
npm uninstall @inboundemail/sdk
npm install resend
```

---

### 2. Environment Variables

**Add:**
- `RESEND_API_KEY` - Required for sending emails and optional attachment retrieval
- `RESEND_INBOUND_WEBHOOK_SECRET` - Optional but recommended for webhook signature verification

**Remove (after full migration):**
- `NEXT_INBOUND_API_KEY` - No longer needed once @inboundemail/sdk is removed

**Update Convex secrets:**
```bash
npx convex env set RESEND_API_KEY <your-key>
npx convex env set RESEND_INBOUND_WEBHOOK_SECRET <webhook-secret>
npx convex env remove NEXT_INBOUND_API_KEY
```

---

### 3. Code Changes

#### **File: `convex/emails.ts`**

##### **Imports Section**
```diff
- import { Inbound } from "@inboundemail/sdk";
+ import { Resend } from "resend";
```

##### **Function: `upsertFromInbound` (lines 279-348)**

**Current behavior:** Parses inbound.new webhook format with nested `payload.email` structure and `cleanedContent` fields.

**Required changes:**
1. Add Resend payload detection logic
2. Parse Resend's flat structure with different field names
3. Maintain backward compatibility with inbound.new during transition

**Key Resend format differences:**
- **Structure:** Flat object (no nested `payload.email`)
- **Message ID:** `message_id` instead of `messageId`
- **Timestamp:** `created_at` (ISO string) instead of `receivedAt`/`date`
- **Addresses:** `to`/`cc`/`bcc` are arrays, not strings or objects
- **Body:** `html`/`text` directly (no `cleanedContent` wrapper)

**Implementation approach:**
```typescript
// Detect Resend vs inbound.new format
const p = payload?.email || payload;
const isResend = typeof p?.id === "string" && 
                 (p?.html !== undefined || p?.text !== undefined || 
                  p?.message_id || p?.created_at);

if (isResend) {
  // Map Resend fields
  from = p.from || "Unknown";
  to = Array.isArray(p.to) ? p.to.join(", ") : p.to || undefined;
  cc = Array.isArray(p.cc) ? p.cc.join(", ") : p.cc || undefined;
  bcc = Array.isArray(p.bcc) ? p.bcc.join(", ") : p.bcc || undefined;
  subject = p.subject || "(no subject)";
  body = p.html || p.text || "";
  preview = p.text?.slice(0, 120) || body.slice(0, 120) || subject;
  messageId = p.message_id || p.id;
  receivedAt = p.created_at ? Date.parse(p.created_at) : Date.now();
  threadId = undefined; // Resend doesn't provide threadId
} else {
  // Keep existing inbound.new parsing logic
  // (current lines 283-318)
}
```

##### **Function: `sendEmail` (lines 385-453)**

**Current behavior:** Uses `@inboundemail/sdk` (`Inbound` class) to send emails.

**Required changes:**
1. Replace SDK instantiation
2. Normalize address fields to arrays
3. Update API call structure
4. Handle different response format

**Implementation approach:**
```typescript
// Line 398-399: Replace API key and client initialization
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("RESEND_API_KEY not set");

const resend = new Resend(apiKey);

// Lines 408-417: Normalize addresses to arrays
const parseAddresses = (str: string | undefined): string[] => {
  if (!str) return [];
  return str.split(ADDRESS_DELIMITER_REGEX)
    .map(s => s.trim())
    .filter(Boolean);
};

const sendParams: any = {
  from,
  to: parseAddresses(to),
  subject,
  html,
  text: text || "",
};

const ccList = parseAddresses(cc);
const bccList = parseAddresses(bcc);
if (ccList.length > 0) sendParams.cc = ccList;
if (bccList.length > 0) sendParams.bcc = bccList;

// Line 418: Replace send call
const { data, error } = await resend.emails.send(sendParams);
if (error) {
  throw new Error(`Failed to send email: ${error.message || error}`);
}

// Line 442: Update messageId extraction (Resend returns 'id', not 'messageId')
messageId: data?.id || "sent-" + Date.now().toString(),
```

#### **File: `convex/http.ts`**

**Current behavior:** Simple webhook endpoint that accepts any POST to `/inbound`.

**Optional security enhancement:** Add webhook signature verification.

**Implementation (if enabling signatures):**
```typescript
import { httpActionGeneric, httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import crypto from "crypto";

const http = httpRouter();

http.route({
  path: "/inbound",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    const payload = await req.json();
    
    // Optional: Verify Resend webhook signature
    const signature = req.headers.get("svix-signature");
    const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const rawBody = await req.text(); // May need to re-parse
      // Implement HMAC verification here
      // See: https://resend.com/docs/dashboard/webhooks/verify-signature
    }
    
    await ctx.runMutation(internal.emails.upsertFromInbound, { payload });
    return new Response("ok", { status: 200 });
  }),
});

export default http;
```

**Note:** Signature verification requires accessing the raw request body. Consider implementing in a later phase if initial testing is successful without it.

#### **File: `inbox-convex-inbound.md`**

**Update documentation:**
- Replace references to inbound.new with Resend
- Update webhook URL configuration instructions
- Update environment variable names
- Add Resend-specific setup steps

---

## Key Differences: inbound.new vs Resend

| Feature | inbound.new | Resend |
|---------|-------------|--------|
| **Payload Structure** | Nested (`payload.email`) | Flat object |
| **Message ID** | `messageId` or `id` | `message_id` + `id` |
| **Timestamp** | `receivedAt` or `date` | `created_at` (ISO string) |
| **From Address** | String or `{text: "..."}` | String: `"Name <email>"` |
| **To/CC/BCC** | String or object with `.text` | Arrays: `["a@x.com", "b@y.com"]` |
| **Body Content** | `cleanedContent.html/text` | `html` / `text` (raw) |
| **Thread Support** | May include `threadId` | Not provided |
| **Attachments** | Varies | Array with IDs + metadata |
| **Webhook Security** | Basic/API key | HMAC signature (Svix) |

---

## Migration Strategy

### Phase 1: Dual-Format Parsing (Recommended for Zero-Downtime)

1. **Deploy parser updates** that accept both inbound.new and Resend formats
2. **Keep existing webhook** active during testing
3. **Configure Resend webhook** pointing to same `/inbound` endpoint
4. **Test Resend delivery** while inbound.new remains active
5. **Switch DNS/MX records** when confident
6. **Remove inbound.new fallback code** after full cutover

**Benefit:** Allows rollback at any point; no service interruption.

### Phase 2: Sending Migration

1. **Update `sendEmail` function** to use Resend SDK
2. **Test sending** to delivered@resend.dev and real addresses
3. **Verify sent email storage** in database
4. **Deploy to production**
5. **Remove @inboundemail/sdk dependency**

### Phase 3: Future Enhancements (Optional)

1. **Webhook signature verification** for security
2. **Attachment support** (fetch and store inline images, files)
3. **HTML sanitization** (if needed for raw Resend HTML)
4. **Custom threading logic** using In-Reply-To/References headers

---

## Potential Risks & Mitigations

### Risk 1: Webhook Spoofing
**Impact:** Unauthorized emails could be inserted into database  
**Mitigation:** Implement webhook signature verification with `RESEND_INBOUND_WEBHOOK_SECRET`  
**Priority:** High (implement after initial testing)

### Risk 2: Duplicate Messages
**Impact:** Same email inserted twice during transition  
**Mitigation:** Ensure idempotency uses `payload.message_id || payload.id` consistently  
**Priority:** Critical (include in initial implementation)

### Risk 3: Address Parsing Issues
**Impact:** To/CC/BCC fields not stored correctly  
**Mitigation:** Robust array-to-CSV conversion; test with multiple recipients  
**Priority:** High (include in initial implementation)

### Risk 4: DNS Cutover Timing
**Impact:** Email delivery interruption during DNS propagation  
**Mitigation:** 
- Lower TTL before migration
- Plan cutover during low-traffic window
- Keep both providers active briefly if possible  
**Priority:** Medium

### Risk 5: Missing HTML Sanitization
**Impact:** XSS vulnerabilities from raw HTML  
**Mitigation:** 
- Verify DOMPurify is still applied in UI rendering
- Consider sanitizing in `upsertFromInbound` if needed  
**Priority:** Medium (verify current sanitization approach)

### Risk 6: Attachment/Inline Image Loss
**Impact:** CID-referenced images won't render  
**Mitigation:** Accept as known limitation for MVP; implement attachment fetching later  
**Priority:** Low (future enhancement)

### Risk 7: Rate Limits
**Impact:** Resend default is 2 req/sec; batch sends may fail  
**Mitigation:** Implement exponential backoff; contact Resend for limit increase  
**Priority:** Low (only if high-volume sending)

---

## Testing Plan

### Unit Tests

#### Test Case 1: Resend Webhook Parsing
**Setup:** POST to `/inbound` with Resend-format payload  
**Sample payload:**
```json
{
  "id": "a39999a6-88e3-48b1-888b-beaabcde1b33",
  "to": ["recipient@example.com"],
  "from": "Sender <sender@example.com>",
  "created_at": "2025-10-09T14:37:40.951732+00:00",
  "subject": "Hello World",
  "html": "<p>Body content</p>",
  "text": "Body content",
  "message_id": "<111-222-333@email.provider.example.com>",
  "cc": ["cc@example.com"],
  "bcc": []
}
```
**Expected:** Email inserted with correct fields; `receivedAt` parsed from ISO timestamp

#### Test Case 2: Backward Compatibility
**Setup:** POST with existing inbound.new format  
**Expected:** Email still inserted correctly (no regressions)

#### Test Case 3: Idempotency
**Setup:** POST same Resend payload twice  
**Expected:** Only one email record created (by `messageId`)

#### Test Case 4: Multiple Recipients
**Setup:** Resend payload with multiple addresses in `to`, `cc`, `bcc`  
**Expected:** Stored as comma-separated string; contacts extracted correctly

#### Test Case 5: Webhook Signature Verification (if implemented)
**Setup:** POST with valid/invalid Svix signature  
**Expected:** Valid accepted, invalid rejected with 401

### Integration Tests

#### Test Case 6: Send Email via Resend
**Setup:** Call `sendEmail` with test data  
**Expected:** 
- Email delivered to Resend test address
- Stored in database with category "sent"
- Draft deleted if `draftId` provided

#### Test Case 7: Reply Threading
**Setup:** Reply to an email with existing `threadId`  
**Expected:** Sent email has same `threadId` in database

### Manual Tests

#### Test Case 8: End-to-End Receiving
**Steps:**
1. Configure Resend webhook in dashboard
2. Send test email to configured inbound address
3. Verify email appears in inbox UI
4. Check all fields (from, to, subject, body) render correctly

#### Test Case 9: End-to-End Sending
**Steps:**
1. Compose new email in UI
2. Send via Resend
3. Verify delivery to recipient
4. Check sent email appears in Sent folder

#### Test Case 10: HTML Rendering
**Steps:**
1. Receive email with complex HTML from Resend
2. Verify rendering in detail view
3. Ensure no XSS issues with unsanitized content

---

## Rollback Plan

### If Issues Detected Pre-Production
1. Revert code changes via git
2. Redeploy previous version
3. Continue using inbound.new

### If Issues Detected Post-Production (Receiving)
1. Update DNS/MX records back to inbound.new
2. Wait for DNS propagation (respect TTL)
3. Investigate and fix issues
4. Re-attempt migration

### If Issues Detected Post-Production (Sending)
1. Hotfix: Re-add `@inboundemail/sdk` dependency
2. Revert `sendEmail` function to previous implementation
3. Deploy immediately
4. Investigate Resend sending issues offline

---

## Configuration Steps

### Resend Dashboard Setup

1. **Create Resend account** (if not already done)
2. **Add domain** and verify DNS records
3. **Configure inbound routing:**
   - Navigate to Inbound section
   - Add webhook URL: `https://<deployment>.convex.site/inbound`
   - Enable webhook signing (recommended)
   - Copy webhook secret for environment variable
4. **Generate API key:**
   - Navigate to API Keys
   - Create new key with "Sending" permissions
   - Copy for `RESEND_API_KEY`
5. **Test webhook delivery:**
   - Use Resend's webhook testing tool
   - Verify 200 OK response from Convex endpoint

### Convex Environment Setup

```bash
# Set new secrets
npx convex env set RESEND_API_KEY <your-api-key>
npx convex env set RESEND_INBOUND_WEBHOOK_SECRET <webhook-secret>

# After full migration complete, remove old key
npx convex env remove NEXT_INBOUND_API_KEY
```

### DNS Configuration (for receiving)

**Required MX records** (varies by domain):
- Check Resend documentation for specific MX values
- Update MX records in your DNS provider
- Lower TTL before migration (e.g., 300 seconds)
- Monitor email delivery during propagation window

---

## Success Criteria

- [ ] All unit tests passing with Resend payload format
- [ ] Backward compatibility maintained with inbound.new format
- [ ] Emails received via Resend webhook appear in inbox
- [ ] Emails sent via Resend API are delivered successfully
- [ ] Sent emails stored in database with correct metadata
- [ ] No duplicate messages from idempotency handling
- [ ] HTML rendering works correctly for received emails
- [ ] Reply/forward functionality maintains threading
- [ ] Contact extraction works with Resend address formats
- [ ] No regressions in existing features (star, archive, trash, etc.)
- [ ] Webhook endpoint responds within acceptable latency
- [ ] Optional: Webhook signatures verified correctly

---

## Timeline Estimate

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Preparation** | Review docs, setup Resend account, configure domain | 1 hour |
| **Code Changes** | Update parser, migrate sending, update deps | 2-4 hours |
| **Testing** | Unit tests, integration tests, manual verification | 2-3 hours |
| **Deployment** | Deploy to staging, configure webhooks, DNS cutover | 1-2 hours |
| **Monitoring** | Watch for issues, verify delivery, cleanup | 1 hour |
| **Security** | Implement webhook signature verification | 0.5-2 hours |
| **Total** | Full migration | **4-10 hours** |

---

## Future Enhancements (Post-Migration)

### Attachment Support
**Effort:** 2-8 hours  
**Approach:**
- Store attachment metadata in database (new schema field)
- Fetch attachment content via Resend API using email ID + attachment ID
- Display attachments in UI with download links
- Handle inline images (CID references)

### Advanced Threading
**Effort:** 4-6 hours  
**Approach:**
- Parse `In-Reply-To` and `References` headers from Resend payload
- Implement custom threading logic to group conversations
- Update UI to show threaded view

### Webhook Signature Verification
**Effort:** 0.5-2 hours  
**Approach:**
- Implement Svix signature verification in `convex/http.ts`
- Use raw request body for HMAC validation
- Reject requests with invalid signatures

### HTML Sanitization Layer
**Effort:** 1-2 hours  
**Approach:**
- Add DOMPurify sanitization in `upsertFromInbound` before storing
- Configure allowlist for safe HTML tags
- Remove potentially dangerous attributes

### Rate Limit Handling
**Effort:** 1-2 hours  
**Approach:**
- Add exponential backoff for Resend API calls
- Queue emails if rate limit exceeded
- Log rate limit errors for monitoring

---

## References

- [Resend Inbound Email Docs](https://resend.com/docs/api-reference/emails/receive-email)
- [Resend Webhook Verification](https://resend.com/docs/dashboard/webhooks/verify-signature)
- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [Convex HTTP Actions](https://docs.convex.dev/functions/http-actions)
- [Current Implementation Docs](./inbox-convex-inbound.md)

---

## Questions for Discussion

1. **Timing:** When would you like to perform the migration? (Consider low-traffic window)
2. **Scope:** Start with receiving only, or migrate both receiving + sending at once?
3. **Attachments:** Are attachments a critical MVP feature, or acceptable as future work?
4. **Testing:** Do you have a staging environment, or will we test carefully in production?
5. **Monitoring:** Do you have logging/alerting set up for webhook failures or email delivery issues?
6. **Backward compatibility:** How long should we maintain dual-format parsing before removing inbound.new support?

---

**Next Steps:**
1. Review this plan and answer discussion questions
2. Set up Resend account and configure domain
3. Create feature branch for migration work
4. Implement Phase 1 (dual-format parsing)
5. Deploy to staging and run test suite
6. Perform DNS cutover during planned maintenance window
7. Monitor production and verify success criteria
8. Remove inbound.new code after 1-2 weeks of stable operation
