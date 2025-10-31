import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireUserId(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}
