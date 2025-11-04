# Security Guide

This document outlines security best practices and considerations for self-hosting Blank Inbox.

## Reporting Security Issues

If you discover a security vulnerability, please **DO NOT** open a public issue.

Instead, contact the maintainers directly:
- Email: [your-security-contact@example.com]
- Or use GitHub's private vulnerability reporting (if enabled)

We'll work with you to address the issue promptly.

---

## Security Architecture

### Authentication

Blank Inbox uses **password-based authentication** via `@convex-dev/auth`:

- Passwords are hashed using industry-standard bcrypt
- Session tokens are stored in HTTP-only cookies
- Session cookies persist for **30 days** (configurable via middleware)
- No third-party OAuth providers (simplifies deployment)
- Single-tenant design: Only **one user** per instance

### Authorization

- All routes (except `/signin`, `/api/auth/*`) require authentication
- Convex queries/mutations verify user authentication via `getAuthUserId()`
- Next.js proxy (`proxy.ts`) protects routes at the edge
- Unauthorized access redirects to `/signin`

### Data Isolation

Since this is a **single-tenant application**, there is no multi-user data isolation:
- One instance = one user = all emails belong to that user
- If you need multi-user support, deploy separate instances

---

## Best Practices for Self-Hosters

### 1. Environment Variables

**DO:**
- ✅ Store secrets in `.env.local` (never commit to git)
- ✅ Use Convex's environment variable management for backend secrets
- ✅ Rotate API keys periodically (Resend, inbound.new)
- ✅ Use `ADMIN_EMAIL` to restrict signup to a specific address

**DON'T:**
- ❌ Never commit `.env.local` to version control
- ❌ Never expose `RESEND_API_KEY` or `NEXT_INBOUND_API_KEY` to the client
- ❌ Never log sensitive data (passwords, API keys, email content)

### 2. HTTPS Requirement

**Always use HTTPS in production:**
- Required for secure cookie transmission
- Required for webhook signature verification
- Required to protect credentials in transit

**For local development:**
- `http://localhost` is acceptable for testing
- Webhooks may not work locally without tunneling (ngrok, Cloudflare Tunnel)

### 3. Password Policy

**Current implementation:**
- No enforced complexity requirements (browser validation only)

**Recommendations for production:**
- Use a strong password (12+ characters, mixed case, numbers, symbols)
- Consider adding password strength requirements in `app/signin/page.tsx`
- Consider adding rate limiting to prevent brute-force attacks

### 4. Webhook Security

Inbound emails are received via Convex HTTP endpoint at `/inbound` with comprehensive security:

**Current implementation:**
- ✅ **Secret-based authentication**: `X-Webhook-Secret` header verification (shared secret approach)
- ✅ **Rate limiting**: 60 requests/minute per IP address with automatic cleanup
- ✅ **Request validation**:
  - Content-Type must be `application/json` (415 Unsupported Media Type if invalid)
  - Content-Length max 256KB (413 Payload Too Large if exceeded)
  - POST method only (404 for other methods)
- ✅ **Schema validation**: All payloads validated with Zod before processing
- ✅ **Idempotency**: messageId index prevents duplicate email creation
- ✅ **Security logging**: All violations logged to `webhook_security_logs` table
- ✅ **Auto-cleanup**: Rate limit records deleted after 1 hour, security logs after 7 days

**Setup required:**
1. Generate a strong secret: `openssl rand -hex 32`
2. Add to environment: `INBOUND_WEBHOOK_SECRET=your-secret`
3. Configure webhook providers with `X-Webhook-Secret` header
4. See [docs/WEBHOOK_SECURITY.md](file:///Users/davidblank/Documents/blank-blog/blank-inbox/docs/WEBHOOK_SECURITY.md) for detailed setup

**Response codes:**
- `200 OK` - Valid request processed
- `401 Unauthorized` - Missing/invalid secret
- `413 Payload Too Large` - Body exceeds 256KB
- `415 Unsupported Media Type` - Wrong Content-Type
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Secret not configured

### 5. Content Security

**HTML Email Rendering:**
- Email bodies are sanitized with **centralized DOMPurify** before display
- **One-time hook initialization** prevents security configuration drift
- **Security guards implemented**:
  - Protocol allowlist for src/href (http, https, mailto only)
  - Tracking pixel removal (blocks 1x1 images)
  - iframe restricted to YouTube/Vimeo only
  - Enforces `rel="noopener noreferrer nofollow"` on all links
  - Blocks style tags (XSS vector)
- Prevents XSS attacks, tabnabbing, and tracking

**Attachments:**
- Not yet implemented
- When added, scan with antivirus (ClamAV, VirusTotal API)
- Validate file types and sizes

### 6. Database Security

**Convex Backend:**
- Authentication is handled by Convex Auth
- All queries/mutations require authentication
- No direct database access from client (only via Convex functions)

**Recommendations:**
- Regularly backup your Convex database
- Monitor Convex logs for unusual activity
- Use Convex's built-in security rules

### 7. Dependency Security

**Keeping dependencies updated:**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Or use automated tools
npm install -g npm-check-updates
ncu -u
npm install
```

**Critical dependencies to monitor:**
- `@convex-dev/auth` (authentication)
- `next` (framework security patches)
- `dompurify` (XSS prevention)
- `react`, `react-dom` (UI security)

---

## Security Checklist for Deployment

Before deploying to production:

- [ ] All secrets stored in environment variables (not in code)
- [ ] `.env.local` added to `.gitignore`
- [ ] HTTPS enabled on domain
- [ ] Strong password chosen for admin account
- [ ] `ADMIN_EMAIL` set to restrict signup
- [ ] Webhook endpoint configured with HTTPS URL
- [ ] Dependencies updated (`npm audit` clean)
- [ ] Convex environment variables set (not just local `.env`)
- [ ] Rate limiting considered (Cloudflare, Vercel Edge Config)
- [ ] Monitoring/logging enabled (Vercel, Sentry, LogDNA)
- [ ] Backup strategy in place for Convex data
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

---

## Security Headers (Implemented)

**Status:** ✅ Complete

All security headers are configured in `next.config.ts`:

- **X-Frame-Options: DENY** - Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- **Referrer-Policy: strict-origin-when-cross-origin** - Protects privacy
- **Permissions-Policy** - Restricts camera, microphone, geolocation
- **Content-Security-Policy (CSP)** - See next.config.ts for full policy
- **Strict-Transport-Security (HSTS)** - Forces HTTPS in production

These headers are applied to all routes automatically.

---

## Threat Model

### In Scope

- ✅ Unauthorized access to email inbox
- ✅ XSS via malicious email content
- ✅ Brute-force password attacks
- ✅ Email spoofing/phishing detection
- ✅ Webhook injection attacks

### Out of Scope

- Multi-user data isolation (single-tenant design)
- Advanced spam filtering (rely on email provider)
- End-to-end email encryption (use provider's encryption)
- GDPR compliance (self-hosted, you control data)

---

## Incident Response

If you suspect a security breach:

1. **Immediately rotate all API keys** (Resend, inbound.new, Convex)
2. **Sign out and change your password**
3. **Check Convex logs** for suspicious queries/mutations
4. **Review recent emails** for unauthorized access
5. **Update dependencies** if vulnerability is dependency-related
6. **Report to maintainers** (see top of document)

---

## Security Logging and Audit Trail

Blank Inbox implements **centralized security logging** with structured JSON logs for monitoring and incident response.

### What Gets Logged

**Security Events (`logSecurity`):**
- Authentication failures (unauthorized email signup attempts)
- Authorization failures (no valid session)
- Multiple signup attempts (single-user violation)
- Webhook security violations (invalid signatures, rate limits, payload size)
- Suspicious patterns (rapid requests, invalid payloads)

**Operational Errors (`logError`):**
- Email send failures (Resend/inbound.new provider errors)
- Email fetch failures (API errors, network issues)
- Configuration errors (missing API keys, secrets)

**Warnings (`logWarning`):**
- Retryable failures (email body fetch retries)
- Provider fallbacks (Resend → inbound.new)

**Informational (`logInfo`):**
- Successful webhook processing
- Email processing metadata

### Log Format

All logs are **JSON-structured** for easy parsing:

```json
{
  "timestamp": "2025-11-03T12:34:56.789Z",
  "level": "security",
  "message": "Unauthorized access attempt - no valid session",
  "context": {
    "action": "authorization_failure",
    "ip": "203.0.113.42"
  }
}
```

### PII Protection

**NEVER logged:**
- ❌ Email message bodies (HTML/text content)
- ❌ Passwords or password hashes
- ❌ API keys, tokens, or secrets
- ❌ Personal identifiable information (names, addresses)

**Safe to log:**
- ✅ Email document IDs (Convex IDs like `jd7abc123...`)
- ✅ IP addresses (for rate limiting/security monitoring)
- ✅ Timestamps and event types
- ✅ HTTP status codes and error messages
- ✅ Action/operation names

### Accessing Logs

**Development:**
```bash
npm run dev
# Logs appear in terminal console
```

**Production (Convex Dashboard):**
1. Visit [Convex Dashboard](https://dashboard.convex.dev)
2. Select your deployment
3. Navigate to **Logs** tab
4. Filter by log level: `error`, `security`, `warn`, `info`
5. Search by timestamp, message, or context fields

**Log Retention:**
- **Webhook security logs**: Auto-cleaned after **7 days** (stored in `webhook_security_logs` table)
- **Console logs (Convex)**: Retained per Convex plan limits (typically 7-30 days)
- **Application logs**: Ephemeral (console output only, not persisted)

### Monitoring Best Practices

1. **Set up alerts** for `security` level logs (indicates potential attack)
2. **Review `error` logs** regularly for operational issues
3. **Monitor rate limit violations** (may indicate DDoS attempts)
4. **Track authentication failures** (could indicate brute-force attacks)

### Log Rotation

**Webhook security logs** (stored in database):
- Automatically cleaned up after 7 days (see `convex/webhooks.ts:logSecurityEvent`)
- Old records deleted during new log insertion to prevent unbounded growth

**Rate limit records** (stored in database):
- Automatically cleaned up after 1 hour (see `convex/webhooks.ts:checkRateLimit`)
- Historical data not needed beyond active rate limit window

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Convex Security Best Practices](https://docs.convex.dev/auth)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

**Last Updated:** 2025-11-03
