# Test Webhook Payloads

## Testing the Dual-Format Webhook Parser

Use these payloads to test that the `/inbound` endpoint correctly handles both Resend and inbound.new formats.

## Important: Resend Webhook Configuration

**Resend webhooks have two types:**
1. **Basic notification** (default) - Only includes metadata (from, to, subject, message_id) but NO email body
2. **Full content** - Includes html/text body content

**To get email body content:**
- In Resend dashboard → Webhooks → Edit your webhook
- Enable "Include email content" option
- Or use Resend API to fetch email content separately using `email_id`

The payload you shared is the basic notification type (no html/text fields), which is why emails appear blank.

### Resend Webhook Format (Actual Structure)

This is the actual format Resend sends (with type and nested data):

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "created_at": "2025-10-23T16:03:49.000Z",
    "type": "email.received",
    "data": {
      "attachments": [],
      "created_at": "2025-10-23 16:04:04.575853+00",
      "email_id": "be66d4ac-b510-48a1-9be7-3b133b1a63ec",
      "from": "sender@example.com",
      "message_id": "<test-message-id@mail.gmail.com>",
      "subject": "Test Email",
      "to": ["recipient@example.com"],
      "html": "<p>This is the email body</p>",
      "text": "This is the email body"
    }
  }'
```

**Expected Results:**
- Email inserted from nested `data` object
- `from`: "sender@example.com"
- `to`: "recipient@example.com"
- `subject`: "Test Email"
- `body`: HTML content
- `messageId`: "<test-message-id@mail.gmail.com>"
- `receivedAt`: Parsed from nested `created_at` timestamp

### Resend Format Test (Legacy Direct Format)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "a39999a6-88e3-48b1-888b-beaabcde1b33",
    "to": ["recipient@example.com"],
    "from": "Test Sender <sender@example.com>",
    "created_at": "2025-10-23T14:37:40.951732+00:00",
    "subject": "Test from Resend Format",
    "html": "<p>This is a <strong>test email</strong> using Resend format.</p>",
    "text": "This is a test email using Resend format.",
    "message_id": "<resend-test-123@example.com>",
    "cc": ["cc@example.com"],
    "bcc": []
  }'
```

**Expected Results:**
- Email inserted into database
- `from`: "Test Sender <sender@example.com>"
- `to`: "recipient@example.com"
- `cc`: "cc@example.com"
- `subject`: "Test from Resend Format"
- `body`: HTML content
- `messageId`: "<resend-test-123@example.com>"
- `receivedAt`: Parsed from `created_at` timestamp

### Resend Format Test (Multiple Recipients)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "id": "b49999b7-99f4-59c2-999c-cfaabdde2c44",
    "to": ["alice@example.com", "bob@example.com"],
    "from": "sender@example.com",
    "created_at": "2025-10-23T15:00:00.000000+00:00",
    "subject": "Multi-recipient test",
    "text": "Testing multiple recipients",
    "message_id": "<resend-multi-456@example.com>",
    "cc": ["cc1@example.com", "cc2@example.com"],
    "bcc": []
  }'
```

**Expected Results:**
- `to`: "alice@example.com, bob@example.com"
- `cc`: "cc1@example.com, cc2@example.com"

### inbound.new Format Test (Legacy)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Legacy Sender <legacy@example.com>",
    "to": "you@example.com",
    "subject": "Test from inbound.new format",
    "text": "This is a test using the legacy inbound.new format",
    "html": "<p>This is a test using the legacy <em>inbound.new</em> format</p>",
    "messageId": "inbound-test-789",
    "date": "2025-10-23T16:00:00Z"
  }'
```

**Expected Results:**
- Email inserted into database
- `from`: "Legacy Sender <legacy@example.com>"
- `to`: "you@example.com"
- `subject`: "Test from inbound.new format"
- `messageId`: "inbound-test-789"
- `receivedAt`: Parsed from `date` timestamp

### inbound.new Format Test (Nested Structure)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "email": {
      "from": { "text": "Nested Sender <nested@example.com>" },
      "to": { "text": "recipient@example.com" },
      "subject": "Nested inbound.new test",
      "cleanedContent": {
        "html": "<p>Cleaned HTML content</p>",
        "text": "Cleaned text content"
      },
      "messageId": "nested-inbound-999",
      "receivedAt": "2025-10-23T17:00:00Z"
    }
  }'
```

**Expected Results:**
- Email inserted from nested `email` object
- `from`: "Nested Sender <nested@example.com>"
- `body`: Uses `cleanedContent.html`
- `preview`: Uses `cleanedContent.text`

### Idempotency Test (Resend)

Send the same Resend payload twice to verify idempotency:

```bash
# First request
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "id": "idempotency-test-id",
    "to": ["test@example.com"],
    "from": "sender@example.com",
    "created_at": "2025-10-23T18:00:00.000000+00:00",
    "subject": "Idempotency test",
    "text": "Should only insert once",
    "message_id": "<idempotency-unique-123@example.com>"
  }'

# Second request (same payload)
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "id": "idempotency-test-id",
    "to": ["test@example.com"],
    "from": "sender@example.com",
    "created_at": "2025-10-23T18:00:00.000000+00:00",
    "subject": "Idempotency test",
    "text": "Should only insert once",
    "message_id": "<idempotency-unique-123@example.com>"
  }'
```

**Expected Results:**
- Both requests return 200 OK
- Only ONE email record in database
- Second request returns existing `_id`

### Edge Cases

#### Empty CC/BCC Arrays (Resend)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "id": "edge-case-1",
    "to": ["test@example.com"],
    "from": "sender@example.com",
    "created_at": "2025-10-23T19:00:00.000000+00:00",
    "subject": "No CC/BCC",
    "text": "Testing empty arrays",
    "message_id": "<edge-1@example.com>",
    "cc": [],
    "bcc": []
  }'
```

**Expected Results:**
- `cc`: undefined (not empty string)
- `bcc`: undefined (not empty string)

#### Missing HTML/Text (Resend)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "id": "edge-case-2",
    "to": ["test@example.com"],
    "from": "sender@example.com",
    "created_at": "2025-10-23T20:00:00.000000+00:00",
    "subject": "Only subject, no body",
    "message_id": "<edge-2@example.com>",
    "cc": [],
    "bcc": []
  }'
```

**Expected Results:**
- `body`: "" (empty string)
- `preview`: Uses subject as fallback

#### Text-Only Email (Resend)

```bash
curl -i -X POST https://YOUR-DEPLOYMENT.convex.site/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "id": "edge-case-3",
    "to": ["test@example.com"],
    "from": "sender@example.com",
    "created_at": "2025-10-23T21:00:00.000000+00:00",
    "subject": "Plain text only",
    "text": "This email has no HTML, only plain text content.",
    "message_id": "<edge-3@example.com>",
    "cc": [],
    "bcc": []
  }'
```

**Expected Results:**
- `body`: Contains plain text (no HTML)
- `preview`: First 120 chars of text

## Verification Checklist

After running tests:

- [ ] Both Resend and inbound.new formats insert successfully
- [ ] Multiple recipients converted to CSV strings correctly
- [ ] Idempotency works (duplicate messageId returns existing record)
- [ ] Empty arrays don't create empty string values for cc/bcc
- [ ] Timestamps parsed correctly from both `created_at` and `date`/`receivedAt`
- [ ] Preview generated from appropriate source (text > body > subject)
- [ ] Messages appear in inbox UI with correct formatting
- [ ] HTML rendering works properly
- [ ] Contact extraction works with both address formats

## Next Steps After Testing

Once all tests pass:

1. Configure Resend webhook in dashboard to point at `/inbound`
2. Send real test email to Resend inbound address
3. Verify receipt in application UI
4. Keep inbound.new active during transition period
5. Monitor both sources for 1-2 weeks
6. Remove legacy parsing code once confident
