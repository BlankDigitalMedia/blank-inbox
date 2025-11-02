import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";
import { Value, ConvexError } from "convex/values";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile: (params: Record<string, Value | undefined>) => {
        const email = params.email as string;
        
        // Server-side email restriction enforcement if configured
        if (params.flow === "signUp" && ADMIN_EMAIL && email !== ADMIN_EMAIL) {
          throw new ConvexError({
            message: `Registration is restricted to ${ADMIN_EMAIL}`,
            code: "INVALID_EMAIL"
          });
        }
        
        return {
          email,
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      // Enforce single-user restriction: if more than one user exists, delete the newest and throw
      const users = await ctx.db.query("users").collect();
      
      // If more than one user exists, this is a second signup attempt (single-user violation)
      if (users.length > 1) {
        // Find and delete the newly created user (has the most recent _creationTime)
        const sortedUsers = [...users].sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
        await ctx.db.delete(sortedUsers[0]._id);
        
        throw new ConvexError({
          message: "Registration is closed. This instance only allows a single user.",
          code: "SIGNUP_DISABLED"
        });
      }
    },
  },
});
