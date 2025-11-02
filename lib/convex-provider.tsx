"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!), []);
  return (
    <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>
  );
}


