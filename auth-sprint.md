# Authentication Implementation Sprint

Implementation plan for Convex Auth with GitHub OAuth single-user authentication.

**Estimated Total Effort:** 1-2 hours

---

## Epic 1: GitHub OAuth App Setup

### Story 1.1: Create GitHub OAuth Application
- [ ] Go to GitHub Settings > Developer settings > OAuth Apps
- [ ] Click "New OAuth App"
- [ ] Set Application name (e.g., "Blank Inbox")
- [ ] Set Homepage URL to your app URL
- [ ] Set Authorization callback URL to `https://your-domain.com/api/auth/callback/github`
- [ ] Note: For local dev, also add `http://localhost:3000/api/auth/callback/github`
- [ ] Generate and copy Client ID
- [ ] Generate and copy Client Secret

**Story Points:** 1

---

## Epic 2: Convex Auth Configuration

### Story 2.1: Install Convex Auth Package
- [ ] Run `npm install @convex-dev/auth`
- [ ] Verify package added to package.json

**Story Points:** 1

### Story 2.2: Update Convex Schema with Auth Tables
- [ ] Open `convex/schema.ts`
- [ ] Import `authTables` from `@convex-dev/auth/server`
- [ ] Merge `authTables` into schema definition
- [ ] Keep existing `emails` table and indexes

**Story Points:** 1

### Story 2.3: Create Convex Auth Configuration
- [ ] Create new file `convex/auth.config.ts`
- [ ] Import GitHub provider from `@convex-dev/auth/providers/GitHub`
- [ ] Configure GitHub provider with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- [ ] Set `AUTH_SECRET` environment variable reference
- [ ] Export auth configuration

**Story Points:** 2

### Story 2.4: Create Next.js Auth API Routes
- [ ] Create directory `app/api/auth/[...convex]/`
- [ ] Create `route.ts` in that directory
- [ ] Export `GET` and `POST` from `@convex-dev/auth/nextjs`
- [ ] Verify routes are accessible at `/api/auth/*`

**Story Points:** 1

---

## Epic 3: Server-Side Authorization Guards

### Story 3.1: Create Owner Guard Helper
- [ ] Create new file `convex/lib/auth.ts`
- [ ] Import `ConvexError` from `convex/values`
- [ ] Implement `requireOwner(ctx)` function
- [ ] Check `ctx.auth.getUserIdentity()` is not null
- [ ] Compare identity email against `process.env.OWNER_EMAIL`
- [ ] Optionally support `process.env.OWNER_SUB` for subject-based auth
- [ ] Throw `ConvexError` if not authenticated or not owner
- [ ] Return identity if authorized

**Story Points:** 2

### Story 3.2: Add Auth Guard to Email Queries
- [ ] Open `convex/emails.ts`
- [ ] Import `requireOwner` from `./lib/auth`
- [ ] Add `await requireOwner(ctx)` to `list` query
- [ ] Add `await requireOwner(ctx)` to `unreadCount` query
- [ ] Add `await requireOwner(ctx)` to `listArchived` query
- [ ] Add `await requireOwner(ctx)` to `listStarred` query
- [ ] Add `await requireOwner(ctx)` to `listSent` query
- [ ] Add `await requireOwner(ctx)` to `listTrashed` query
- [ ] Add `await requireOwner(ctx)` to `listDrafts` query
- [ ] Add `await requireOwner(ctx)` to `get` query
- [ ] Add `await requireOwner(ctx)` to `contacts` query

**Story Points:** 2

### Story 3.3: Add Auth Guard to Email Mutations
- [ ] Add `await requireOwner(ctx)` to `toggleStar` mutation
- [ ] Add `await requireOwner(ctx)` to `markRead` mutation
- [ ] Add `await requireOwner(ctx)` to `toggleArchive` mutation
- [ ] Add `await requireOwner(ctx)` to `toggleTrash` mutation
- [ ] Add `await requireOwner(ctx)` to `saveDraft` mutation
- [ ] Add `await requireOwner(ctx)` to `deleteDraft` mutation
- [ ] Add `await requireOwner(ctx)` to `storeSentEmail` mutation

**Story Points:** 1

### Story 3.4: Add Auth Guard to Email Actions
- [ ] Add `await requireOwner(ctx)` to `sendEmail` action
- [ ] Verify action still works with auth check

**Story Points:** 1

### Story 3.5: Create Viewer Query for Client-Side Auth State
- [ ] Create new file `convex/auth.ts`
- [ ] Import query from `./_generated/server`
- [ ] Implement `viewer` query with no args
- [ ] Get identity with `ctx.auth.getUserIdentity()`
- [ ] Return null if no identity
- [ ] Check if email/subject matches `OWNER_EMAIL` or `OWNER_SUB`
- [ ] Return `{ email, name }` if owner, null otherwise

**Story Points:** 2

---

## Epic 4: Webhook Security

### Story 4.1: Add Webhook Secret Validation
- [ ] Open `convex/http.ts` (or create if doesn't exist)
- [ ] Add check for `x-inbound-secret` header in webhook handler
- [ ] Compare against `process.env.INBOUND_WEBHOOK_SECRET`
- [ ] Throw error if secret doesn't match
- [ ] Ensure `upsertFromInbound` remains an `internalMutation`
- [ ] Do NOT add `requireOwner` to webhook mutations

**Story Points:** 2

---

## Epic 5: Frontend Authentication UI

### Story 5.1: Create Login Page
- [ ] Create new file `app/login/page.tsx`
- [ ] Add page title "Sign in to Blank Inbox"
- [ ] Add link/button to `/api/auth/signin/github`
- [ ] Style with existing Tailwind/shadcn components
- [ ] Add GitHub icon from lucide-react

**Story Points:** 1

### Story 5.2: Create Auth Gate Component
- [ ] Create new file `components/auth/auth-gate.tsx`
- [ ] Mark as client component with `"use client"`
- [ ] Import and use `useQuery` from `convex/react`
- [ ] Query `api.auth.viewer`
- [ ] Show loading state while query is pending
- [ ] If viewer is null, show "Not authenticated" and link to `/login`
- [ ] If viewer exists, render children

**Story Points:** 2

### Story 5.3: Wrap Application with Auth Gate
- [ ] Open `app/layout.tsx` or main app entry point
- [ ] Import `AuthGate` component
- [ ] Wrap main application content with `<AuthGate>`
- [ ] Ensure ConvexProvider is outside AuthGate
- [ ] Test that unauthenticated users see login prompt

**Story Points:** 1

### Story 5.4: Add Sign Out Button
- [ ] Open sidebar component (e.g., `components/mail-sidebar.tsx`)
- [ ] Add "Sign out" button or menu item
- [ ] Link to `/api/auth/signout`
- [ ] Style consistently with existing UI
- [ ] Test sign out flow

**Story Points:** 1

---

## Epic 6: Environment Configuration & Deployment

### Story 6.1: Create Local Environment Variables
- [ ] Create `.env.local` file (if not exists)
- [ ] Add `GITHUB_CLIENT_ID=your_client_id`
- [ ] Add `GITHUB_CLIENT_SECRET=your_client_secret`
- [ ] Add `AUTH_SECRET=` with random 32+ character string
- [ ] Add `OWNER_EMAIL=your_github_email@example.com`
- [ ] Add `INBOUND_WEBHOOK_SECRET=` with random string
- [ ] Ensure `.env.local` is in `.gitignore`

**Story Points:** 1

### Story 6.2: Configure Convex Environment Variables
- [ ] Run `npx convex env set GITHUB_CLIENT_ID your_value`
- [ ] Run `npx convex env set GITHUB_CLIENT_SECRET your_value`
- [ ] Run `npx convex env set AUTH_SECRET your_value`
- [ ] Run `npx convex env set OWNER_EMAIL your_value`
- [ ] Run `npx convex env set INBOUND_WEBHOOK_SECRET your_value`
- [ ] Verify with `npx convex env list`

**Story Points:** 1

### Story 6.3: Configure Vercel Environment Variables
- [ ] Go to Vercel project settings > Environment Variables
- [ ] Add `GITHUB_CLIENT_ID` (production value)
- [ ] Add `GITHUB_CLIENT_SECRET` (production value)
- [ ] Add `AUTH_SECRET` (production value)
- [ ] Add `OWNER_EMAIL` (your email)
- [ ] Add `INBOUND_WEBHOOK_SECRET` (production value)
- [ ] Add `NEXT_INBOUND_API_KEY` (if not already set)
- [ ] Set all variables for Production, Preview, and Development

**Story Points:** 1

### Story 6.4: Update GitHub OAuth Callback URLs
- [ ] Go to GitHub OAuth App settings
- [ ] Add production callback URL: `https://your-vercel-domain.com/api/auth/callback/github`
- [ ] Keep localhost URL for development
- [ ] Save changes

**Story Points:** 1

---

## Epic 7: Testing & Verification

### Story 7.1: Test Local Authentication Flow
- [ ] Run `npm run dev`
- [ ] Navigate to app without auth
- [ ] Verify redirect/prompt to login page
- [ ] Click "Sign in with GitHub"
- [ ] Complete GitHub OAuth flow
- [ ] Verify successful authentication and app access
- [ ] Test sign out functionality

**Story Points:** 2

### Story 7.2: Test Authorization Guards
- [ ] Verify all email list views load (inbox, archive, starred, etc.)
- [ ] Test email detail view loads
- [ ] Test starring/unstarring emails
- [ ] Test archiving/unarchiving
- [ ] Test composing and sending email
- [ ] Test draft save/delete
- [ ] Verify no console errors related to auth

**Story Points:** 2

### Story 7.3: Test Webhook Security
- [ ] Send test webhook to `/api/inbound` or webhook endpoint
- [ ] Verify it fails without `x-inbound-secret` header
- [ ] Add correct secret header
- [ ] Verify webhook processes successfully
- [ ] Verify email appears in inbox

**Story Points:** 1

### Story 7.4: Test Production Deployment
- [ ] Deploy to Vercel with `vercel --prod` or push to main
- [ ] Navigate to production URL
- [ ] Test full authentication flow on production
- [ ] Verify GitHub OAuth callback works with production URL
- [ ] Test email operations work in production
- [ ] Monitor Vercel and Convex logs for errors

**Story Points:** 2

### Story 7.5: Security Verification
- [ ] Open app in incognito/private window
- [ ] Verify unauthenticated access is blocked
- [ ] Try accessing with different GitHub account (if available)
- [ ] Verify non-owner account is rejected
- [ ] Confirm only owner email can access data

**Story Points:** 1

---

## Epic 8: Documentation

### Story 8.1: Update AGENTS.md
- [ ] Add authentication section to AGENTS.md
- [ ] Document that app uses Convex Auth with GitHub OAuth
- [ ] List required environment variables
- [ ] Note that all Convex functions are owner-protected
- [ ] Document webhook security approach

**Story Points:** 1

### Story 8.2: Create Authentication Troubleshooting Guide
- [ ] Document common issues (callback URL mismatch, env vars not set)
- [ ] Add instructions for checking Convex logs
- [ ] Document how to verify owner email matches GitHub
- [ ] Add steps to regenerate secrets if needed

**Story Points:** 1

---

## Acceptance Criteria

- [ ] Only authenticated owner can access any part of the application
- [ ] Unauthenticated users are prompted to log in
- [ ] GitHub OAuth flow completes successfully
- [ ] All email operations work for authenticated owner
- [ ] Webhooks still process emails with correct secret
- [ ] Application works on Vercel production
- [ ] No security warnings or errors in console
- [ ] Sign out functionality works correctly
