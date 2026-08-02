import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/app/(landing)/_components/Footer";
import { Navbar } from "@/app/(landing)/_components/Navbar";

type LegalPageProps = {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  label: string;
  title: string;
};

export function LegalPage({
  children,
  description,
  icon: Icon,
  label,
  title,
}: LegalPageProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mb-10 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <header className="mb-12 border-b pb-10">
            <div className="text-muted-foreground mb-5 flex items-center gap-2 text-sm font-medium">
              <Icon className="size-4" />
              {label}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7">
              {description}
            </p>
            <p className="text-muted-foreground mt-5 text-xs">
              Last updated August 1, 2026
            </p>
          </header>

          <article className="text-muted-foreground [&_h2]:text-foreground [&_strong]:text-foreground space-y-10 text-[15px] leading-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:pl-1 [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export function LegalContact({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 text-foreground mt-5 rounded-xl border p-5 text-sm leading-6">
      {children}
    </div>
  );
}
