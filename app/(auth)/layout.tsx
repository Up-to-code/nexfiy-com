import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-background min-h-full">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <ModeToggle />
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-5 pb-16 sm:px-8">
        <section className="w-full max-w-sm">{children}</section>
      </div>
    </main>
  );
}
