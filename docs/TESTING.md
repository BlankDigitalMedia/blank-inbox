# Manual Testing Guide

This document outlines the manual test plan for the Blank Inbox authentication and email system.

## Prerequisites

- Development environment running (`npm run dev`)
- Convex backend deployed or running locally
- Clean database (for first-run tests)

## Test Suite

### 1. Happy Path: First-Run Flow

**Objective:** Verify complete user journey from initial signup to inbox access.

**Steps:**
1. Navigate to `http://localhost:3000`
2. Verify redirect to `/signin`
3. Click "Sign up" toggle
4. Enter email: `admin@example.com`
5. Enter password: `TestPassword123!`
6. Click "Sign Up"
7. Verify redirect to `/` (inbox)
8. Verify inbox loads with email list
9. Click profile menu → Sign Out
10. Verify redirect to `/signin`
11. Enter same email and password
12. Click "Sign In"
13. Verify successful sign-in and redirect to inbox

**Expected Results:**
- ✅ Signup succeeds on first user
- ✅ Inbox is accessible after authentication
- ✅ Sign out redirects to signin page
- ✅ Sign in works with correct credentials

---

### 2. Negative Test: Signup After First User

**Objective:** Verify single-tenant enforcement (signup blocked after first user).

**Steps:**
1. Complete Test #1 (first user created)
2. Sign out
3. Click "Sign up" toggle
4. Enter different email: `hacker@example.com`
5. Enter password: `AnyPassword123!`
6. Click "Sign Up"

**Expected Results:**
- ❌ Signup fails with error: "Signup is disabled. This instance is limited to a single user."
- ✅ User remains on signin page
- ✅ Error message is displayed clearly

---

### 3. Negative Test: Wrong Password

**Objective:** Verify authentication fails with incorrect credentials.

**Steps:**
1. Navigate to `/signin`
2. Enter valid email: `admin@example.com`
3. Enter wrong password: `WrongPassword123!`
4. Click "Sign In"

**Expected Results:**
- ❌ Sign-in fails with error message
- ✅ User remains on signin page
- ✅ Error message is user-friendly (not exposing internals)

---

### 4. Negative Test: Non-Existent Email

**Objective:** Verify sign-in fails for non-existent users.

**Steps:**
1. Navigate to `/signin`
2. Enter non-existent email: `nobody@example.com`
3. Enter any password: `Password123!`
4. Click "Sign In"

**Expected Results:**
- ❌ Sign-in fails with error message
- ✅ Error doesn't reveal whether email exists (security)

---

### 5. Edge Case: Unauthenticated Access

**Objective:** Verify all protected routes block unauthenticated access.

**Steps:**
1. Clear browser cookies/session
2. Attempt to access each protected route directly:
   - `http://localhost:3000/`
   - `http://localhost:3000/inbox`
   - `http://localhost:3000/sent`
   - `http://localhost:3000/starred`
   - `http://localhost:3000/archive`
   - `http://localhost:3000/drafts`
   - `http://localhost:3000/trash`
   - `http://localhost:3000/compose`

**Expected Results:**
- ✅ All protected routes redirect to `/signin`
- ✅ After signin, user redirects back to original destination (if implemented)

---

### 6. Edge Case: ADMIN_EMAIL Restriction

**Objective:** Verify ADMIN_EMAIL environment variable restricts signup.

**Prerequisites:**
- Set `ADMIN_EMAIL=admin@example.com` in Convex environment
- Clean database

**Steps:**
1. Navigate to `/signin`
2. Click "Sign up" toggle
3. Attempt signup with non-admin email: `user@example.com`
4. Enter password: `Password123!`
5. Click "Sign Up"

**Expected Results:**
- ❌ Signup fails with error: "Signup is restricted to admin@example.com"

**Then:**
6. Clear form
7. Enter admin email: `admin@example.com`
8. Enter password: `Password123!`
9. Click "Sign Up"

**Expected Results:**
- ✅ Signup succeeds
- ✅ User is signed in and redirected to inbox

---

### 7. Email Functionality Tests

**Objective:** Verify core email operations work for authenticated users.

**Steps:**
1. Sign in as authenticated user
2. Navigate to inbox
3. Test email reading:
   - Click on an email
   - Verify detail view opens
   - Verify HTML content renders safely
4. Test email composition:
   - Click "Compose"
   - Fill in recipient, subject, body
   - Send email
   - Verify success toast
5. Test email actions:
   - Archive an email
   - Star an email
   - Move email to trash
   - Restore from trash
6. Test drafts:
   - Start composing email
   - Close without sending
   - Verify draft is saved
   - Navigate to Drafts
   - Verify draft appears
   - Open and send draft

**Expected Results:**
- ✅ All email operations succeed
- ✅ UI updates reflect changes
- ✅ Toast notifications appear for actions

---

### 8. Session Persistence Tests

**Objective:** Verify authentication state persists across page reloads.

**Steps:**
1. Sign in successfully
2. Navigate to inbox
3. Refresh page (F5 or Cmd+R)
4. Verify user remains authenticated
5. Verify inbox loads without redirect
6. Close browser tab
7. Open new tab to `http://localhost:3000`
8. Verify user remains authenticated (within session timeout)

**Expected Results:**
- ✅ Session persists across page refreshes
- ✅ Session persists across tab close/reopen (within timeout)

---

### 9. Multi-Tab Behavior

**Objective:** Verify sign-out propagates across tabs.

**Steps:**
1. Sign in successfully in Tab 1
2. Open Tab 2 to `http://localhost:3000`
3. Verify Tab 2 shows authenticated state
4. Sign out in Tab 1
5. Switch to Tab 2
6. Interact with Tab 2 (navigate, click email, etc.)

**Expected Results:**
- ✅ Tab 2 eventually detects sign-out
- ✅ Tab 2 redirects to `/signin` or shows unauthenticated state

---

### 10. Email Webhook Tests

**Objective:** Verify inbound email webhooks work correctly.

**Prerequisites:**
- Webhook URL configured with email provider (Resend or inbound.new)
- `NEXT_INBOUND_API_KEY` set
- `INBOUND_WEBHOOK_SECRET` configured

**Steps:**
1. Send email to your inbox's inbound address
2. Wait for webhook delivery (check network tab or logs)
3. Refresh inbox in browser
4. Verify new email appears

**Expected Results:**
- ✅ Email is received via webhook
- ✅ Email is stored in Convex database
- ✅ Email appears in inbox

---

### 11. Webhook Security Tests

**Objective:** Verify webhook endpoint security measures work correctly.

**Prerequisites:**
- `INBOUND_WEBHOOK_SECRET` configured
- `test-webhook-security.sh` script available

**Steps:**
1. Run test script: `./test-webhook-security.sh http://localhost:3000/inbound`
2. Verify all 7 security tests pass:
   - Test 1: Missing secret header → 401
   - Test 2: Invalid secret → 401
   - Test 3: Missing Content-Type → 415
   - Test 4: Wrong HTTP method → 404
   - Test 5: Oversized payload → 413
   - Test 6: Valid request → 200
   - Test 7: Rate limit → 429 (after 60 requests)

**Expected Results:**
- ✅ All authentication checks work
- ✅ Content validation works
- ✅ Rate limiting works
- ✅ Security events logged to `webhook_security_logs` table

---

### 12. Security Headers Tests

**Objective:** Verify security headers are present on all routes.

**Steps:**
1. Open browser DevTools (Network tab)
2. Navigate to various routes: `/`, `/signin`, `/inbox`, `/sent`, etc.
3. Inspect response headers for each request

**Expected Headers:**
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- ✅ `Content-Security-Policy` (production)
- ✅ `Strict-Transport-Security` (production HTTPS only)

**Alternative Testing (cURL):**
```bash
curl -I http://localhost:3000/
# Verify headers in output
```

---

### 13. Accessibility Tests

**Objective:** Verify accessibility features work correctly.

**Prerequisites:**
- Screen reader installed (VoiceOver on macOS, NVDA on Windows)

**Steps:**
1. Run ESLint: `npm run lint` (should have no jsx-a11y violations)
2. Test keyboard navigation:
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Test dialog focus trapping
3. Test with screen reader:
   - Navigate through email list
   - Activate icon-only buttons (should announce purpose)
   - Fill out composer form (should announce field labels)
   - Verify toast notifications are announced

**Expected Results:**
- ✅ No jsx-a11y ESLint errors
- ✅ All interactive elements reachable via keyboard
- ✅ Icon buttons have aria-labels
- ✅ Form fields have proper labels
- ✅ Screen reader can navigate all UI elements

---

## Test Report Template

After completing tests, document results:

```markdown
## Test Run Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Local/Staging/Production]
**Database State:** [Clean/Existing Users]

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Happy Path: First-Run | ✅ Pass | |
| 2 | Signup After First User | ✅ Pass | |
| 3 | Wrong Password | ✅ Pass | |
| 4 | Non-Existent Email | ✅ Pass | |
| 5 | Unauthenticated Access | ✅ Pass | |
| 6 | ADMIN_EMAIL Restriction | ⏭️ Skip | Not using ADMIN_EMAIL |
| 7 | Email Functionality | ✅ Pass | |
| 8 | Session Persistence | ✅ Pass | |
| 9 | Multi-Tab Behavior | ⚠️ Warn | Minor delay in tab sync |
| 10 | Email Webhook | ✅ Pass | |

**Issues Found:** [List any bugs or unexpected behavior]
**Recommendations:** [Suggestions for improvements]
```

---

## Automated Testing (Future)

While this guide focuses on manual testing, consider implementing:

- **Unit tests:** Auth helper functions, email parsing
- **Integration tests:** Convex queries/mutations with auth
- **E2E tests:** Playwright or Cypress for full user flows
- **Security tests:** OWASP ZAP for vulnerability scanning
