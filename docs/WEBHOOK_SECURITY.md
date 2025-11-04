# Webhook Security

This document describes the security features implemented for the `/inbound` webhook endpoint.

## Overview

The inbound email webhook endpoint at `/inbound` accepts POST requests from email providers (Resend and inbound.new) to receive incoming emails. To prevent abuse and unauthorized access, comprehensive security measures are enforced.

## Security Features

### 1. Webhook Authentication (Shared Secret)

**Protection:** Prevents unauthorized requests from arbitrary sources.

**Implementation:**
- Requires `X-Webhook-Secret` header on all webhook requests
- Secret value configured via `INBOUND_WEBHOOK_SECRET` environment variable
- Returns `401 Unauthorized` if header is missing or doesn't match expected value
- Returns `500 Internal Server Error` if secret is not configured

**Configuration:**
```bash
# Generate a strong random secret
openssl rand -hex 32

# Add to .env.local
INBOUND_WEBHOOK_SECRET=your-generated-secret-here
```

**Provider Setup:**
- **Resend:** Add `X-Webhook-Secret: your-secret` to webhook configuration headers
- **inbound.new:** Add `X-Webhook-Secret: your-secret` to webhook configuration headers

### 2. Request Validation

**Protection:** Prevents malformed or malicious requests.

**Checks:**
- **HTTP Method:** Only `POST` requests accepted (enforced by route definition)
- **Content-Type:** Must be `application/json` (returns `415 Unsupported Media Type` if invalid)
- **Body Size:** Limited to 256KB (returns `413 Payload Too Large` if exceeded)

### 3. Rate Limiting

**Protection:** Prevents DoS attacks and webhook spam.

**Implementation:**
- 60 requests per minute per IP address
- Tracks requests in `webhook_rate_limits` Convex table
- Uses minute buckets (requests are counted per minute window)
- Returns `429 Too Many Requests` when limit exceeded
- Old rate limit records (>1 hour) are automatically cleaned up

**Database Schema:**
```typescript
webhook_rate_limits: {
  ip: string,           // Client IP address
  minuteBucket: number, // Unix timestamp / 60000
  count: number,        // Request count in this bucket
}
```

### 4. Security Logging

**Protection:** Audit trail for security incidents.

**Logged Events:**
- `invalid_signature` - Missing or wrong webhook secret
- `invalid_content_type` - Non-JSON content type
- `payload_too_large` - Request body exceeds 256KB
- `rate_limit_exceeded` - IP exceeded rate limit

**Database Schema:**
```typescript
webhook_security_logs: {
  timestamp: number,    // Unix timestamp
  ip: string,           // Client IP address
  eventType: string,    // Event type (see above)
  details: string?,     // Optional additional context
}
```

**Log Retention:**
- Logs automatically cleaned up after 7 days
- Does NOT log request bodies (PII protection)

### 5. IP Address Detection

**Implementation:**
- Checks `X-Forwarded-For` header (first IP if comma-separated)
- Falls back to `X-Real-IP` header
- Falls back to `"unknown"` if headers missing

**Note:** Relies on reverse proxy (Vercel, etc.) to set these headers correctly.

## Security Response Codes

| Code | Message | Trigger |
|------|---------|---------|
| 200 | OK | Valid request processed successfully |
| 401 | Unauthorized | Missing or invalid `X-Webhook-Secret` |
| 413 | Payload Too Large | Request body exceeds 256KB |
| 415 | Unsupported Media Type | Content-Type is not `application/json` |
| 429 | Too Many Requests | Rate limit exceeded (60 req/min) |
| 500 | Internal Server Error | `INBOUND_WEBHOOK_SECRET` not configured |

## Testing

Use the provided test script to verify security features:

```bash
# Set your webhook secret
export INBOUND_WEBHOOK_SECRET=your-secret-here

# Run tests against local dev server
./test-webhook-security.sh http://localhost:3000/inbound

# Run tests against production
./test-webhook-security.sh https://yourdomain.com/inbound
```

**Test Coverage:**
1. Missing secret header → 401
2. Invalid secret → 401
3. Missing Content-Type → 415
4. Wrong HTTP method → 404
5. Oversized payload → 413
6. Valid request → 200
7. Rate limit enforcement → 429 after 60 requests

## Monitoring

### Check Security Logs

Query recent security events in Convex dashboard or via query:

```typescript
// convex/queries.ts (add this function)
export const getSecurityLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    return await ctx.db
      .query("webhook_security_logs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});
```

### Check Rate Limit Status

Monitor current rate limit buckets:

```typescript
// convex/queries.ts (add this function)
export const getRateLimitStatus = query({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const minuteBucket = Math.floor(Date.now() / 60000);
    return await ctx.db
      .query("webhook_rate_limits")
      .withIndex("by_ip_bucket", (q) => 
        q.eq("ip", ip).eq("minuteBucket", minuteBucket)
      )
      .first();
  },
});
```

## Security Hardening Recommendations

1. **Rotate Secrets Regularly:** Change `INBOUND_WEBHOOK_SECRET` every 90 days
2. **Use Strong Secrets:** Minimum 32 characters, cryptographically random
3. **Enable HTTPS:** Always use HTTPS in production (Vercel does this by default)
4. **Monitor Logs:** Review security logs weekly for suspicious patterns
5. **IP Allowlisting:** Consider adding IP allowlist for known provider IPs (advanced)
6. **Signature Verification:** Upgrade to HMAC signature verification for stronger auth (future enhancement)

## Threat Model

**Mitigated Threats:**
- ✅ Unauthorized webhook requests (random attackers)
- ✅ Email injection attacks (oversized payloads)
- ✅ DoS via webhook spam (rate limiting)
- ✅ Content-type confusion attacks (strict validation)
- ✅ Replay attacks (existing messageId idempotency)

**Not Mitigated (Out of Scope):**
- ❌ IP spoofing (trust reverse proxy headers)
- ❌ Provider account compromise (trust provider authentication)
- ❌ Advanced DoS (distributed attacks from many IPs)

## Migration Guide

If you're upgrading from an unprotected webhook:

1. **Add Environment Variable:**
   ```bash
   # Generate secret
   openssl rand -hex 32
   
   # Add to Vercel environment variables or .env.local
   INBOUND_WEBHOOK_SECRET=<generated-secret>
   ```

2. **Update Provider Webhook Configuration:**
   - **Resend:** Dashboard → Webhooks → Edit → Add Header: `X-Webhook-Secret: <secret>`
   - **inbound.new:** Dashboard → Webhooks → Edit → Add Header: `X-Webhook-Secret: <secret>`

3. **Deploy Updated Code:**
   ```bash
   npm run build
   # Deploy to Vercel or your hosting platform
   ```

4. **Verify:**
   ```bash
   # Test with invalid secret (should fail)
   curl -X POST https://yourdomain.com/inbound \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: wrong-secret" \
     -d '{"test": "data"}'
   
   # Should return 401 Unauthorized
   
   # Test with valid secret (should work)
   curl -X POST https://yourdomain.com/inbound \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: <your-actual-secret>" \
     -d '{"test": "data"}'
   
   # Should return 200 OK
   ```

## Future Enhancements

Potential improvements for stronger security:

1. **HMAC Signature Verification:** Provider-specific signature validation (Resend supports this)
2. **IP Allowlisting:** Restrict to known provider IP ranges
3. **Request ID Tracking:** Prevent duplicate processing across retries
4. **Webhook Firewall:** Dedicated WAF rules for webhook endpoints
5. **Anomaly Detection:** ML-based detection of suspicious patterns
6. **Per-Provider Secrets:** Different secrets for Resend vs inbound.new

## References

- [Resend Webhook Security](https://resend.com/docs/webhooks)
- [OWASP Webhook Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
- [RFC 9421 HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html)
