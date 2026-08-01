import Image from "next/image";
import Link from "next/link";
import { FileText, PlugZap, Sparkles } from "lucide-react";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-background min-h-full">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Go to Zotion home">
          <Logo />
        </Link>
        <ModeToggle />
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-stretch gap-8 px-5 pb-5 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        <section className="bg-secondary/60 relative hidden overflow-hidden rounded-3xl border lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
          <div className="relative z-10 max-w-lg space-y-5">
            <div className="bg-background/80 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-xs backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Your ideas, organized
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
                One workspace for your notes and tools.
              </h2>
              <p className="text-muted-foreground max-w-md text-base leading-7">
                Write, organize, upload files, and connect your own MCP servers
                in a workspace that stays in sync.
              </p>
            </div>
          </div>

          <div className="relative flex min-h-72 items-center justify-center py-6">
            <Image
              src="/idea.svg"
              alt="A person developing an idea at their workspace"
              width={1035}
              height={760}
              className="max-h-80 w-auto object-contain mix-blend-multiply dark:hidden"
              priority
            />
            <Image
              src="/idea-dark.svg"
              alt="A person developing an idea at their workspace"
              width={1035}
              height={760}
              className="hidden max-h-80 w-auto object-contain dark:block"
              priority
            />
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3">
            <div className="bg-background/75 flex items-center gap-3 rounded-2xl border p-3.5 backdrop-blur">
              <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
                <FileText className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Live documents</p>
                <p className="text-muted-foreground text-xs">Always in sync</p>
              </div>
            </div>
            <div className="bg-background/75 flex items-center gap-3 rounded-2xl border p-3.5 backdrop-blur">
              <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
                <PlugZap className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Personal MCP</p>
                <p className="text-muted-foreground text-xs">
                  Your own connections
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center py-8 lg:py-12">
          {children}
        </section>
      </div>
    </main>
  );
}
