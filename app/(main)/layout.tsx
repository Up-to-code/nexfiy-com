"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/spinner";
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
      <div className="dark:bg-dark flex h-full items-center justify-center">
        <Spinner size="md" />
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
