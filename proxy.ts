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

