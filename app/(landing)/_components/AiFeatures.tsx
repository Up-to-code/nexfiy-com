import Image from "next/image";

const features = [
  {
    eyebrow: "Write naturally",
    title: "Mix documents, media, links, and data in the same page.",
    image: "/landing/nexfiy-capture-knowledge-v4.png",
    alt: "Notes and files gathering into one organized source",
  },
  {
    eyebrow: "Structure what matters",
    title: "Turn repeated information into databases you can actually browse.",
    image: "/landing/nexfiy-find-answers-v4.png",
    alt: "A magnifying glass connecting an answer to its sources",
  },
  {
    eyebrow: "Connect your tools",
    title: "Expose selected context through the Content API and MCP.",
    image: "/landing/nexfiy-automate-work-v4.png",
    alt: "An agent moving tasks through a continuous workflow",
  },
] as const;

export const AiFeatures = () => {
  return (
    <section
      id="ai"
      className="border-border/40 bg-background text-foreground border-t py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-foreground mb-12 text-3xl font-extrabold tracking-tight sm:text-5xl">
          Pages first. Structured when you need it.
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.eyebrow}
              className="border-border/50 dark:bg-card flex flex-col rounded-3xl border bg-[#f6f5f4] p-6 shadow-xs sm:p-8"
            >
              <p className="text-muted-foreground mb-4 text-xs font-bold tracking-wider uppercase">
                {feature.eyebrow}
              </p>
              <h3 className="text-foreground text-2xl font-bold">
                {feature.title}
              </h3>

              <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-[#faf8f5] dark:border-zinc-800/60 dark:bg-[#05070a]">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={600}
                  height={400}
                  className="h-auto w-full object-contain"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
