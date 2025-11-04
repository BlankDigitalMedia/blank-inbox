/**
 * ROUTE PROTECTION PROXY (Next.js 16 convention)
 * 
 * Replaces middleware.ts in Next.js 16+ for authentication guards.
 * 
 * PROTECTION STRATEGY:
 * - All routes protected by default except /signin
 * - Unauthenticated users redirected to /signin
 * - Authenticated users redirected from /signin to /
 * - 30-day persistent cookie sessions (maxAge: 30 * 24 * 60 * 60)
 * - No additional request size/time limits needed (handled by Convex/Next.js)
 * 
 * ROUTE COVERAGE:
 * - Protected: /, /sent, /starred, /archive, /drafts, /trash, /compose
 * - Public: /signin
 * - Excluded: /_next, /favicon.ico, /robots.txt, static assets
 * 
 * Note: This is a client-side redirect guard only. All server-side operations
 * enforce auth via requireUserId() in Convex queries/mutations/actions.
 */
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/signin"]);
const isProtectedPage = createRouteMatcher([
  "/",
  "/sent",
  "/starred",
  "/archive",
  "/drafts",
  "/trash",
  "/compose",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }

  if (isPublicPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
}, { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } });

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|.*\\..*).*)"],
};

