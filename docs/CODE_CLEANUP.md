# Code Cleanup & Best Practices Review

**Generated:** November 2, 2025  
**Status:** Comprehensive code review findings

## Overview

This document outlines cleanup efforts needed to address security issues, best practices violations, and code quality improvements identified in the Blank Inbox application.

---

## 🚨 HIGH PRIORITY (Critical - Address Immediately)

### 1. **Authentication Not Enforced** ⚠️ CRITICAL SECURITY ISSUE

**Problem:** `requireUserId(ctx)` is async but not awaited, meaning it never blocks requests if unauthenticated.

**Impact:** Any unauthenticated user can call Convex functions

**Files Affected:**
- `convex/emails.ts` - All exported functions (lines 14, 30, 43, 56, 69, 84, 119, 236, 247, 257, 266, 275, 296, 332, 449)

**Fix:**
```typescript
// Before:
requireUserId(ctx);

// After:
await requireUserId(ctx);
```

**Effort:** 15-25 minutes  
**Priority:** P0 - Fix immediately

---

### 2. **Server-Side Signup Restrictions Missing** ⚠️ SECURITY BYPASS

**Problem:** Client-only checks in signin page can be bypassed; backend doesn't enforce single-user or admin email restrictions.

**Files Affected:**
- `convex/auth.ts` - No server-side enforcement
- `app/signin/page.tsx` (lines 24-47) - Client-only checks

**Fix:**
- Add pre-user-create hook in Convex auth to enforce:
  - Single user restriction (check if user already exists)
  - Admin email restriction (if `ADMIN_EMAIL` is set, require match)
- OR add server-side query to block signups when user exists

**Effort:** 1-2 hours  
**Priority:** P0 - Security risk

---

### 3. **Webhook Parsing & Idempotency Issues**

**Problem:**
- Doesn't handle nested payloads consistently (Resend's `payload.data`, arrays for to/cc/bcc)
- No idempotency - duplicate webhooks insert multiple rows
- Missing messageId index for lookups

**Files Affected:**
- `convex/schema.ts` - Missing index on messageId
- `convex/emails.ts` `upsertFromInbound` (lines 129-161)
- `convex/http.ts` (lines 18-29)

**Fix:**
1. Add index to schema:
   ```typescript
   .index("by_messageId", ["messageId"])
   ```
2. Update `upsertFromInbound` to:
   - Parse from `payload.data` if present
   - Join arrays to CSV strings for to/cc/bcc
   - Check if messageId exists; update instead of insert
   - Set receivedAt from created_at/date if provided
3. Ensure http.ts populates body when html/text is in payload

**Effort:** 1-2 hours  
**Priority:** P0 - Data integrity

---

### 4. **HTML Sanitization Hardening** ⚠️ XSS & Privacy Risk

**Problem:**
- Allows `style` attribute (XSS vector)
- Allows `<a>` tags without proper `rel` attributes (tabnabbing risk)
- Allows `<img>` tags (tracking pixel privacy issue)

**Files Affected:**
- `lib/utils.ts` `sanitizeHtml` (lines 16-25)

**Fix:**
1. Remove 'style' from `ALLOWED_ATTR`
2. Add 'rel' to allowed attributes
3. Add DOMPurify hook to enforce `rel="noopener noreferrer nofollow"` on links with `target="_blank"`
4. Consider blocking `<img>` by default or implement image proxy

**Effort:** 1-2 hours  
**Priority:** P0 - Security & Privacy

---

## ⚡ MEDIUM PRIORITY (Important - Address Soon)

### 5. **TypeScript Safety - Remove `any` / `as any`**

**Problem:** Using `as any` bypasses type safety for IDs

**Files Affected:**
- `components/email-page.tsx` (lines 52, 60, 72, 84, 94, 113)
- `app/drafts/page.tsx` (lines 18, 26, 33, 40, 47)
- `components/composer/composer.tsx` (lines 393, 783)
- `convex/emails.ts` (line 397)

**Fix:**
- Import `Id` from `convex/_generated/dataModel`
- Replace `as any` with proper `Id<"emails">` types
- Add helper: `toConvexId(id: string): Id<"emails">`

**Effort:** 1-2 hours  
**Priority:** P1 - Type safety

---

### 6. **Composer Autosave Incomplete**

**Problem:** Debounced ref declared but never used; no editor `onUpdate` hook, so autosave only fires on blur/close

**Files Affected:**
- `components/composer/composer.tsx` (line 129: ref declared, lines 436-443: ineffective flush)

**Fix:**
- Add `editor.on('update')` to schedule debounced `performSave` (~800ms)
- Set `debounced.current = window.setTimeout(...)`
- Clear timers properly
- Remove ineffective queuedRef flow

**Effort:** 1-2 hours  
**Priority:** P1 - Feature completeness

---

### 7. **Clean Dead Code / Unused Imports**

**Files with Unused Imports/Props:**

| File | Unused Items | Lines |
|------|-------------|-------|
| `components/mail-sidebar.tsx` | Badge import, onClose prop | 7, 26-33 |
| `components/email-page.tsx` | Button import | 5 |
| `components/email-list.tsx` | cn import | 4 |
| `components/shared/email-list-item.tsx` | Button import | 3 |
| `components/draft-list.tsx` | Star, Archive imports, cn import | 5, 6 |
| `components/email-detail.tsx` | useRouter, useState imports | 9, 10 |
| `components/theme-toggle.tsx` | React import | 3 |
| `app/drafts/page.tsx` | Button import | 7 |
| `components/composer/composer.tsx` | sanitizeHtml import | 28 |
| `app/layout.tsx` | Font imports and constants | 11-16 |
| `proxy.ts` | "/inbox" in isProtectedPage | 10 |

**Fix:** Remove all unused imports and props

**Effort:** 30-45 minutes  
**Priority:** P2 - Code hygiene

---

### 8. **Documentation & Environment Variable Inconsistencies**

**Issues:**

1. **Webhook Path Mismatch:**
   - Code: Convex HTTP endpoint at `/inbound`
   - Docs: References `/api/inbound` in multiple places
   - **Fix:** Align docs to use Convex deployment URL or add Next proxy route

2. **ADMIN_EMAIL Naming:**
   - README: Uses `ADMIN_EMAIL`
   - SignIn page: Reads `NEXT_PUBLIC_ADMIN_EMAIL` (client-side)
   - **Fix:** Unify to server-only `ADMIN_EMAIL` enforced in Convex

3. **Outdated Reference:**
   - `docs/SECURITY.md`: Still references `middleware.ts` (migrated to `proxy.ts`)
   - **Fix:** Update reference

**Effort:** 30-45 minutes  
**Priority:** P2 - Documentation accuracy

---

### 9. **Contact Extraction Improvements**

**Problem:** Contacts query treats "to" as single string; multiple recipients aren't split

**Files Affected:**
- `convex/emails.ts` `contacts` (lines 81-114)

**Fix:**
- Split comma-separated recipients
- Also extract from `cc` field

**Effort:** 30-45 minutes  
**Priority:** P2 - Feature quality

---

### 10. **Next.js Security Headers Missing**

**Problem:** `next.config.ts` is empty; missing baseline security headers

**Files Affected:**
- `next.config.ts` (lines 1-5)

**Fix:** Add headers block from `docs/SECURITY.md`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

**Effort:** 15-30 minutes  
**Priority:** P1 - Security hardening

---

## 🔧 LOW PRIORITY (Nice to Have)

### 11. **Accessibility - Missing ARIA Labels**

**Problem:** Icon-only buttons missing `aria-label` attributes

**Files Affected:**
- `components/shared/email-list-item.tsx` (lines 53-106) - Star/Archive/Trash buttons
- `components/email-detail.tsx` (lines 96-111) - More icon and action buttons

**Fix:** Add descriptive `aria-label` to all icon-only buttons

**Effort:** 30-45 minutes  
**Priority:** P3 - Accessibility

---

### 12. **Performance - Pagination/Virtualization**

**Problem:** Large email lists could cause performance issues

**Files Affected:**
- `components/email-page.tsx`
- `components/email-list.tsx`
- Convex queries

**Fix:**
- Add Convex `.take()` + cursor-based pagination
- Implement virtual scrolling for large lists

**Effort:** 1-2 days  
**Priority:** P4 - Defer until needed (YAGNI)

---

### 13. **Minor UX Improvements**

**Issues:**

1. **ComposeDock on SignIn:**
   - Shows globally, including on `/signin` page
   - **Fix:** Hide on signin route

2. **Unread Count Not Wired:**
   - MailSidebar prepared for unread count but not implemented
   - **Fix:** Add Convex query `count where read=false and not trashed/archived`

**Effort:** 1-2 hours total  
**Priority:** P3 - UX polish

---

## 📊 Effort Summary

| Priority | Total Effort | Items |
|----------|-------------|-------|
| **High** | 4-8 hours | 4 items |
| **Medium** | 4-7 hours | 6 items |
| **Low** | 2-4 hours | 3 items |
| **Total** | **10-19 hours** | **13 items** |

---

## 🛡️ Risk Mitigation

### Testing Requirements

1. **Auth Changes:**
   - Test locally with and without existing user
   - Verify cannot sign up 2nd time via client or direct calls
   - Test with and without ADMIN_EMAIL set

2. **Webhook Changes:**
   - Validate parsing with examples in `test-webhook-payloads.md`
   - Test with both Resend and inbound.new payloads
   - Verify idempotency (send duplicate webhooks)

3. **Sanitization Changes:**
   - Verify UI after HTML changes
   - Test with various email formats
   - Consider adding toggle for remote images if blocked

---

## 🚀 Advanced Improvements (Future Consideration)

### When to Consider:

1. **Scale/Latency Issues:**
   - Add pagination with cursors
   - List virtualization
   - Convex indexes on starred/archived/trashed, receivedAt, messageId

2. **Enhanced Security Posture:**
   - Webhook signature verification (Svix for Resend)
   - Strict CSP and HSTS headers
   - Image proxy to prevent tracking pixels

3. **Multi-Tenant Support:**
   - Redesign schema with userId on emails
   - Isolate queries by user
   - Per-user rate limiting

### Advanced Path Options:

- **Webhook Security:** Add `/api/inbound` Next route that verifies signatures and forwards to Convex
- **Image Proxy:** Add `/api/image-proxy?src=...` endpoint with caching
- **CSP:** Implement strict Content Security Policy
- **HTML-to-Text:** Add robust preview generation

---

## 📝 Recommended Action Plan

### Phase 1: Critical Security (Week 1)
1. Fix auth await issues (#1)
2. Add server-side signup restrictions (#2)
3. Harden webhook parsing & idempotency (#3)
4. Improve HTML sanitization (#4)
5. Add security headers (#10)

### Phase 2: Code Quality (Week 2)
6. Remove TypeScript `any` usage (#5)
7. Clean unused imports/code (#7)
8. Fix documentation inconsistencies (#8)

### Phase 3: Feature Polish (Week 3)
9. Complete composer autosave (#6)
10. Improve contact extraction (#9)
11. Add accessibility labels (#11)
12. UX improvements (#13)

### Phase 4: Performance (As Needed)
13. Pagination/virtualization (#12)

---

**Next Steps:** Start with Phase 1 items to address critical security issues immediately.
