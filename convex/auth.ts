import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { Value } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile: (async (params: Record<string, Value | undefined>, ctx: GenericActionCtxWithAuthConfig<DataModel>) => {
        const email = params.email as string;
        const flow = params.flow as string | undefined;
        
        // Only enforce signup gating for signUp flow
        if (flow === "signUp") {
          // Count existing users
          const userCount = await ctx.runQuery(api.users.count);
          
          // If users exist, signup is blocked
          if (userCount > 0) {
            throw new Error("Signup is disabled. This instance is limited to a single user.");
          }
          
          // If ADMIN_EMAIL is set, restrict signup to that email
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail && email !== adminEmail) {
            throw new Error(`Signup is restricted to ${adminEmail}`);
          }
        }
        
        return {
          email,
        };
      }) as any,
    }),
  ],
});
