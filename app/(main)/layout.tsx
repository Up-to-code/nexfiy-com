"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";
import Navigation from "./_components/Navigation";
import { SearchCommand } from "@/components/search-command";
import { OrganizationProvider } from "@/features/organizations/OrganizationProvider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { BillingAccessBanner } from "@/features/billing/BillingAccessBanner";
import { Suspense } from "react";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    import("@/components/editor");
  }, []);

  if (isLoading) {
    return (
      <div className="bg-background flex h-full" aria-label="Loading workspace">
        <aside className="border-border/50 hidden w-64 space-y-4 border-r p-4 md:block">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-3/4" />
        </aside>
        <main className="flex-1 space-y-6 p-8 md:p-14">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-40 w-full max-w-3xl" />
          <Skeleton className="h-24 w-full max-w-3xl" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return redirect("/");
  }

  return (
    <OrganizationProvider>
      <div className="bg-background flex h-full transition-colors duration-300">
        <ModalProvider />
        <Suspense fallback={null}>
          <BillingAccessBanner />
        </Suspense>
        <Navigation />
        <main className="h-full min-w-0 flex-1 overflow-y-auto scroll-smooth">
          <SearchCommand />
          {children}
        </main>
      </div>
    </OrganizationProvider>
  );
};
export default MainLayout;
