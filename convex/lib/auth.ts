import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx, ActionCtx } from "@/lib/types";
import { logSecurity } from "@/lib/logger";

export async function requireUserId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    logSecurity("Unauthorized access attempt - no valid session", {
      action: "authorization_failure",
    });
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}
