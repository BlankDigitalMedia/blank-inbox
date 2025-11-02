### Fix: Sign-in did not redirect to inbox

**Date**: 2025-11-01 (Updated: 2025-01-XX)

### Summary

- **Issue**: After entering valid credentials on `/signin`, users stayed on the sign-in page despite successful login attempts visible in Convex logs. Additionally, navigating to other routes after login redirected back to `/signin`.
- **Root cause**: The application was using the React-only `ConvexAuthProvider` instead of the Next.js-specific providers (`ConvexAuthNextjsServerProvider` and `ConvexAuthNextjsProvider`). This prevented proper cookie/session synchronization between Convex Auth and Next.js middleware, requiring a workaround that left `/` unprotected.
- **Fix**: 
  - Replaced React-only providers with Next.js-specific providers (`ConvexAuthNextjsServerProvider` in `app/layout.tsx` and `ConvexAuthNextjsProvider` in `lib/convex-provider.tsx`)
  - Removed hacky token sync endpoint (`/api/auth/sync`) and related redirect logic
  - Re-protected `/` route in middleware (now properly protected with authenticated session)
  - Configured 30-day persistent cookie sessions via middleware `cookieConfig`

### Reproduction steps

1. Navigate to `http://localhost:3000/signin`.
2. Enter email and password.
3. Submit. Prior to the fix, the UI remained on `/signin` or redirected but then bounced back to `/signin` on navigation.

### Diagnosis

- Observed requests:
  - POST to Convex action returned 200 (login accepted).
  - Navigations to `/` returned 307 back to `/signin` (middleware enforcement) before the cookie was recognized.
  - Client redirect code attempted to sync token via `/api/auth/sync` endpoint, but this was a workaround that didn't address the root cause.

### Code changes

1) `app/layout.tsx` — Added Next.js server provider wrapper

```tsx
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConvexAuthNextjsServerProvider>
          {/* existing providers */}
          {children}
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
```

2) `lib/convex-provider.tsx` — Replaced React provider with Next.js provider

```tsx
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

export function ConvexClientProvider({ children }) {
  const client = useMemo(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!), []);
  return (
    <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>
  );
}
```

3) `middleware.ts` — Re-protected `/` and configured cookie persistence

```ts
const isProtectedPage = createRouteMatcher([
  "/",
  "/inbox",
  "/sent",
  // ... other protected routes
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
  if (isPublicPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
}, { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } }); // 30 days
```

4) `app/signin/page.tsx` — Removed token sync workaround

```tsx
const handleSubmit = async (e: FormEvent) => {
  // ... validation ...
  try {
    await signIn("password", { email, password, flow });
    router.replace("/");
  } catch (err) {
    // ... error handling ...
  }
}
```

5) Deleted `app/api/auth/sync/route.ts` — No longer needed

### Verification

- Reloaded `http://localhost:3000/signin`, submitted credentials.
- Sign-in redirects to `/` without bouncing back to `/signin`.
- Navigating between routes (`/`, `/sent`, `/starred`, etc.) works correctly.
- Session persists for 30 days (cookie maxAge configured).
- Inbox UI renders successfully.

### Notes

- The Next.js-specific providers automatically handle cookie/session synchronization between Convex Auth and Next.js middleware, eliminating the need for manual token sync.
- With `/` properly protected, all routes require authentication as expected.
- Session cookies persist for 30 days as configured in middleware.
- For server-side data fetching, use `convexAuthNextjsToken()` with `fetchQuery`/`fetchMutation` in server actions/components.


