import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";
import { Value } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile: (params: Record<string, Value | undefined>) => {
        const email = params.email as string;
        return {
          email,
        };
      },
    }),
  ],
});
