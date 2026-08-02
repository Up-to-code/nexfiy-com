"use client";

import { ReactNode, useEffect } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import posthog from "posthog-js";
import { authClient } from "@/lib/auth-client";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const PostHogIdentity = () => {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session?.user.id) return;

    posthog.identify(session.user.id, {
      email: session.user.email,
      name: session.user.name,
    });
  }, [session?.user.email, session?.user.id, session?.user.name]);

  return null;
};

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <PostHogIdentity />
      {children}
    </ConvexBetterAuthProvider>
  );
};
