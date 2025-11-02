# Auth Implementation Contract

**Created:** Wave 0 Bootstrap  
**Purpose:** Define stable boundaries for parallel Wave 1 implementation

## Routes

- **Sign-in page:** `/signin`
- **Protected routes:** `/` `/inbox` `/sent` `/starred` `/archive` `/drafts` `/trash` `/compose`
- **Public routes:** `/signin` `/api/auth/*` `/_next/*` `/favicon.ico` `/robots.txt` (note: `/inbound` is a Convex HTTP endpoint, not a Next.js route)

## Exports from convex/auth.ts

```typescript
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

**Available for client:**
- `signIn` - function for sign-in/sign-up
- `signOut` - function for sign-out

**Available for Next.js:**
- `convexAuthNextjsMiddleware` (from @convex-dev/auth/nextjs/server)
- `convexAuthNextjsToken` (from @convex-dev/auth/nextjs/server)

**Available for Convex functions:**
- `isAuthenticated` (from convex/auth.ts)
- `getAuthUserId` (from @convex-dev/auth/server)

## File Ownership (Wave 1)

### Agent B (Backend)
- `convex/auth.ts` (extends with signup gating logic)
- `convex/lib/auth.ts` (new helper file)
- All `convex/emails.ts` queries/mutations/actions (add auth guards)

### Agent C (Client)
- `app/layout.tsx` (wrap with ConvexAuthProvider)
- `app/signin/page.tsx` (new sign-in UI)
- App shell/header (add sign-out button)
- Client provider setup

### Agent D (Next.js Protection)
- `middleware.ts` (new file)
- Server components that need auth
- Server route handlers (if any)

### Agent E (QA/Docs - Wave 2)
- `README.md`
- `.env.example`
- `docs/` directory
- Testing files

## Dependencies Installed

- `@convex-dev/auth`
- `@auth/core@0.37.0`

## Convex Configuration

- Schema includes `authTables` from `@convex-dev/auth/server`
- HTTP router includes `auth.addHttpRoutes(http)`
- Password provider configured in `convex/auth.ts`

## Wave 1 Start Conditions

✅ Dependencies installed  
✅ Convex Auth initialized  
✅ Base convex/auth.ts created with Password provider  
✅ authTables added to schema  
✅ HTTP routes configured  
✅ Contract documented

**Wave 1 agents may now proceed in parallel.**
