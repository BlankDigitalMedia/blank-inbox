# Sprint Plan: Auth Strategy for OSS Single-Tenant Inbox

## Executive Summary (Decision)
Use **Convex Auth with the built-in Password provider** as the primary auth mechanism, bootstrapped for a single admin user. This keeps setup simple (no extra services beyond Convex), works entirely within Convex, is secure enough for a single-tenant self-hosted app, and avoids email deliverability friction for Monday launch. Optionally add Magic Link via Resend later for improved UX.

**Why not Basic HTTP Auth:** It doesn't propagate identity to Convex and cannot protect your Convex cloud endpoints; it's easy to bypass by calling Convex functions directly, offers poor UX, and complicates WebSockets. It's not appropriate as the only protection for a Convex app.

---

## Epics and Stories

### Epic 1 — Auth Foundation with Convex Auth (S-M)
**Goal:** Add Convex Auth to the app and enable password-based sign-in on web.

- [ ] **Install and initialize Convex Auth** (S)
  - **Acceptance:**
    - `@convex-dev/auth` and `@auth/core` are installed
    - `npx @convex-dev/auth` run successfully initializes files
    - `convex/schema.ts` includes `authTables` from `@convex-dev/auth/server`
  - **Estimate:** 0.5–1h

- [ ] **Wire up provider in the client (React or Next.js)** (S)
  - **Acceptance:**
    - App uses `ConvexAuthProvider` from `@convex-dev/auth/react`
    - Auth state is available in the app; signed-out state renders a sign-in screen
  - **Estimate:** 0.5–1h

- [ ] **Implement Password provider (no email verification to start)** (S)
  - **Acceptance:**
    - `convex/auth.ts` configured with Password provider:
      ```ts
      export const { auth, signIn, signOut, store, isAuthenticated } = 
        convexAuth({ providers: [Password] })
      ```
    - Sign-in page contains email and password fields, plus a toggle for sign-in/sign-up
    - `signIn("password", formData)` triggers sign-in/sign-up flows
  - **Estimate:** 1h

- [ ] **Add minimal sign-out UI** (S)
  - **Acceptance:**
    - A Sign out button that calls `signOut` exists and returns to the sign-in page
  - **Estimate:** 0.5h

**Notes:**
- Defer password reset and email verification to a later enhancement to avoid introducing Resend dependency for auth at launch

---

### Epic 2 — Single-Tenant Constraints and Bootstrap (S-M)
**Goal:** Ensure only one admin exists and sign-ups are closed after first setup.

- [ ] **First-run bootstrap (create admin)** (S)
  - **Acceptance:**
    - If users table has 0 users, sign-up is allowed; else, sign-up is disabled
    - After creating the first account, app switches to "sign-in only"
  - **Estimate:** 1h

- [ ] **Optional: Lock to allowed admin email via env** (S)
  - **Acceptance:**
    - If `ADMIN_EMAIL` env var is set, sign-up only allowed for that email
    - Attempting to sign up with a different email returns a clear error
  - **Estimate:** 0.5–1h

- [ ] **Authorization guard in Convex functions** (S)
  - **Acceptance:**
    - All queries/mutations/actions that access inbox data call `getAuthUserId(ctx)` or `isAuthenticated` and return unauthorized if absent
    - Add a simple shared helper to enforce auth at the top of functions
  - **Estimate:** 1–2h

---

### Epic 3 — Protect Routes and Server Calls (Next.js) (S)
**Goal:** Prevent unauthenticated access to app routes.

- [ ] **Add convexAuthNextjsMiddleware for route protection** (S)
  - **Acceptance:**
    - `middleware.ts` redirects unauthenticated users from protected routes (e.g., `/`, `/inbox`, `/sent`) to `/signin`
    - Signed-in users are redirected away from `/signin` to the app
  - **Estimate:** 1h

- [ ] **Use convexAuthNextjsToken in server actions/handlers** (S)
  - **Acceptance:**
    - Server components/route handlers use `convexAuthNextjsToken` for authenticated `fetchQuery`/`fetchMutation`
    - No side effects on GET routes (CSRF guard)
  - **Estimate:** 1h

---

### Epic 4 — QA, Security, and Docs (S)
**Goal:** Validate end-to-end flows and document setup.

- [ ] **E2E happy path** (S)
  - **Acceptance:**
    - Create admin on first run → sign out → sign in → access inbox → sign out
  - **Estimate:** 0.5–1h

- [ ] **Negative tests and hardening** (S)
  - **Acceptance:**
    - Unauthenticated access to Convex functions returns unauthorized
    - Sign-ups blocked after first user
    - CSRF guidance applied (no side effects on GET if Next.js)
  - **Estimate:** 1h

- [ ] **README/docs for self-hosters** (S)
  - **Acceptance:**
    - Clear steps: set Convex URL, set optional `ADMIN_EMAIL`, run dev, create admin, sign in
    - No paid services required; note optional Resend for future magic links
  - **Estimate:** 1h

---

### Epic 5 — Optional Enhancements (Post-Launch) (M-L)
**Goal:** Improve UX with email-based flows using Resend and add reset.

- [ ] **Magic Link via Resend** (M)
  - **Acceptance:**
    - Resend provider configured; `AUTH_RESEND_KEY` set in Convex
    - Sign-in page can send magic link; clicking link signs user in
    - Interstitial page pattern used if needed to mitigate session fixation (per docs)
  - **Estimate:** 2–3h

- [ ] **Password reset via OTP with Resend** (M)
  - **Acceptance:**
    - Reset flow sends OTP; user can set a new password with code
    - Library's automatic rate limiting for failed attempts is effective
  - **Estimate:** 2–3h

- [ ] **Email verification via OTP with Resend** (M)
  - **Acceptance:**
    - On sign-up, user verifies email with code if enabled
  - **Estimate:** 2–3h

---

## Acceptance Criteria (Summary)
- ✅ Password-based sign-in works end-to-end using Convex Auth
- ✅ First-run admin bootstrap works; sign-ups blocked after initial user, or restricted to `ADMIN_EMAIL` if set
- ✅ All Convex functions that access data enforce `isAuthenticated`/`getAuthUserId`
- ✅ Protected routes/pages redirect when signed-out
- ✅ No extra paid services required to launch; Resend optional and off by default for auth
- ✅ Clear, concise setup docs for self-hosters

---

## Time Estimates
- **Epic 1:** S-M (3–5h)
- **Epic 2:** S-M (2–3h)
- **Epic 3:** S (2–3h Next.js)
- **Epic 4:** S (2–3h)
- **Epic 5** (optional): M-L (6–9h total, post-launch)

**Overall (without optional enhancements):** ~1 day (8-14h), comfortably within a Monday launch window.

---

## Dependencies
- **Convex** (existing): Convex URL
- **NPM packages:**
  - `@convex-dev/auth`
  - `@auth/core@0.37.0`
- **Environment variables:**
  - Optional `ADMIN_EMAIL` (restrict first sign-up)
  - If adding email flows later: `AUTH_RESEND_KEY`
- **No Vercel Pro or other paid services required**

---

## Research Findings: Convex Auth

**What it is:**
- First-party library that implements auth inside your Convex backend; no separate auth service required. Works for React SPA, React Native, and has Next.js support under active development.
  - Docs: [Convex Authentication](https://docs.convex.dev/auth/convex-auth) and [Convex Auth overview](https://labs.convex.dev/auth)
  - Beta status noted; Next.js server/middleware docs available

**Supported methods:**
- Magic Links and OTPs (email) via Auth.js providers like Resend
- OAuth (GitHub/Google/Apple) via Auth.js provider configuration
- Passwords (with optional email verification and password reset via OTP/email)
  - Password provider examples and flows are documented

**Setup summary:**
- Install `@convex-dev/auth` and `@auth/core`; run `npx @convex-dev/auth`; add `authTables` to schema; wrap app with `ConvexAuthProvider`
  - [Setup docs](https://labs.convex.dev/auth/setup)
- For email-based flows, configure Resend (or other Auth.js providers) as providers in `convex/auth.ts` and set `AUTH_RESEND_KEY`
  - [Magic Links docs](https://labs.convex.dev/auth/config/email)
- Next.js: Use `convexAuthNextjsMiddleware` to protect routes; use `convexAuthNextjsToken` in server actions/handlers; avoid side-effects in GET to prevent CSRF
  - [Next.js authz docs](https://labs.convex.dev/auth/authz/nextjs)

**Security notes:**
- Always gate Convex functions with `isAuthenticated`/`getAuthUserId`
- For magic links, consider interstitial confirmation to mitigate session fixation
- CSRF considerations when using cookies in Next.js; no side effects on GET

**Suitability for single-tenant self-hosted:**
- ✅ Very suitable: runs entirely in Convex, no separate infra, minimal setup
- ✅ Password provider avoids email deliverability friction and Resend dependency at launch; magic link/OTP can be added later as optional UX improvement
- ✅ You cannot wrap Convex Cloud endpoints behind Basic Auth, so Convex-integrated auth is the right primitive for secure data access

**Key links:**
- Convex Auth docs: https://docs.convex.dev/auth/convex-auth and https://labs.convex.dev/auth
- Setup: https://labs.convex.dev/auth/setup
- Magic Links (Resend): https://labs.convex.dev/auth/config/email
- Passwords: https://labs.convex.dev/auth/config/passwords
- Next.js server-side auth: https://labs.convex.dev/auth/authz/nextjs

---

## Comparison: Convex Auth vs Basic HTTP Auth

| Aspect | Convex Auth | Basic HTTP Auth |
|--------|-------------|-----------------|
| **Setup friction** | Moderate but clear (npm installs + provider wiring) | Minimal for pages, but doesn't protect Convex endpoints |
| **Security** | Real user identity in Convex; enforce authorization in every function | Browser-level only; Convex functions remain publicly callable |
| **Portability** | Runs on Convex Cloud; no external auth service | Tied to hosting/proxy; cannot protect Convex Cloud |
| **Implementation time** | S-M for password flow; M for email flows | S to add middleware, but leaves major security gaps |
| **User experience** | Standard app login screen; extensible | Browser modal prompt; poor UX; no session management |

**Decision:** Convex Auth wins decisively for our Convex-based inbox. Basic HTTP Auth is not acceptable as the sole mechanism.

---

## Risks and Guardrails
- **Convex Auth is beta:** If you hit blocking issues, fallback to password-only SPA flow (no Next.js middleware) to reduce moving parts
- **Next.js cookie/CSRF:** Do not perform side effects in GET server components/handlers; restrict mutations to POST/PUT with `convexAuthNextjsToken`
- **Bootstrap leakage:** Ensure sign-up is disabled after first admin is created; optionally enforce `ADMIN_EMAIL`
- **Email deliverability** (if enabling magic links/reset later): domain verification may delay onboarding; keep password flow as default

---

## When to Consider the Advanced Path
- Multi-user or team accounts, SSO, role-based access, passkeys/2FA needs
- You need enterprise features or compliance: consider WorkOS AuthKit or a mature third-party like Auth0/Clerk
- You need advanced email verification, rate-limiting policies, or password strength enforcement beyond simple rules

---

## Optional Advanced Path (Outline)
- Add Magic Links with Resend and OTP password reset
- Enforce email verification and stronger password validation (zxcvbn, HIBP)
- Introduce role field in users schema and gate routes/features accordingly
- Evaluate OAuth providers for social sign-in (GitHub/Google/Apple) using Auth.js provider configs
