import Image from "next/image";

export const VisionSection = () => {
  return (
    <section id="vision" className="bg-background text-foreground py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="max-w-xl">
          <p className="text-muted-foreground mb-4 text-xs font-bold tracking-[0.18em] uppercase">
            Why we are building it
          </p>
          <h2 className="text-foreground text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            Your workspace should be useful beyond the workspace.
          </h2>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            Nexfiy keeps pages, databases, files, and links together, then gives
            you deliberate ways to reuse that information in products,
            automations, and agent tools.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[#faf8f5] p-2 shadow-xs sm:p-4 dark:border-zinc-800/60 dark:bg-[#05070a]">
          <Image
            src="/landing/nexfiy-shared-context-v4.png"
            alt="Nexfiy mascots sharing documents, databases, files, and connected context"
            width={1200}
            height={800}
            className="h-auto w-full rounded-[1.5rem] object-contain"
          />
        </div>
      </div>
    </section>
  );
};
