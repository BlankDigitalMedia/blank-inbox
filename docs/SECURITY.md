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

Inbound emails are received via Convex HTTP endpoint at `/inbound`:

**Current implementation:**
- Handled by Convex backend (deployed at `https://your-convex-deployment.convex.cloud/inbound`)
- Supports both Resend and inbound.new webhook formats
- No signature verification implemented (relies on obscure URL)

**Recommendations:**
- Enable webhook signature verification (if your provider supports it)
- Use a secret webhook path (e.g., modify Convex HTTP route to `/inbound/[random-token]`)
- Monitor webhook logs for suspicious activity
- Consider IP whitelisting (if your provider has static IPs)

**Example signature verification (future enhancement):**
```typescript
// For Resend webhooks
import { svix } from "svix";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
const payload = await request.text();
const headers = request.headers;

try {
  const event = svix.verify(payload, headers, webhookSecret);
  // Process verified event
} catch (err) {
  return new Response("Invalid signature", { status: 401 });
}
```

### 5. Content Security

**HTML Email Rendering:**
- Email bodies are sanitized with **DOMPurify** before display
- Prevents XSS attacks from malicious email content
- External images/resources are allowed (could be disabled for privacy)

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

## Security Headers (Recommended)

Add to `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}
```

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

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Convex Security Best Practices](https://docs.convex.dev/auth)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

**Last Updated:** 2025-10-30
