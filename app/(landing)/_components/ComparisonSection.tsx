const comparisonRows = [
  {
    capability: "Knowledge & documents",
    nexfiy: "One unified, block-based workspace",
    typical: "Write freely with blocks, embeds, and nested pages",
  },
  {
    capability: "Content API",
    nexfiy: "Choose which databases are available",
    typical: "Read structured records and normalized page blocks",
  },
  {
    capability: "Databases & Project Tracking",
    nexfiy: "Multi-view tables, boards, and timelines",
    typical: "Use the view that fits the same underlying records",
  },
  {
    capability: "MCP connections",
    nexfiy: "Create a scoped workspace environment",
    typical: "Revoke or replace the connection when needed",
  },
  {
    capability: "Workspace model",
    nexfiy: "Keep personal work separate",
    typical: "Create an organization when collaboration begins",
  },
] as const;

export const ComparisonSection = () => {
  return (
    <section
      id="compare"
      className="bg-background text-foreground border-border/40 border-t py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-muted-foreground mb-3 text-xs font-bold tracking-[0.18em] uppercase">
            What connects
          </p>
          <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
            One workspace, several useful surfaces.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg leading-8">
            The same information can remain readable as a page, structured as a
            database, or made available to another tool through an API or MCP.
          </p>
        </div>

        <div className="border-border/50 overflow-hidden border-y">
          <div className="bg-muted/40 text-foreground hidden grid-cols-[1.15fr_1fr_1fr] px-7 py-4 text-sm font-semibold sm:grid dark:bg-zinc-900/60">
            <span>Capability</span>
            <span>How it starts</span>
            <span>What it enables</span>
          </div>
          {comparisonRows.map((row) => (
            <div
              key={row.capability}
              className="border-border/40 grid grid-cols-1 gap-3 border-t px-5 py-5 sm:grid-cols-[1.15fr_1fr_1fr] sm:gap-6 sm:px-7"
            >
              <p className="text-foreground font-semibold">{row.capability}</p>
              <p className="text-foreground/90 flex items-start gap-2 text-sm leading-6">
                <span>
                  <span className="font-semibold sm:hidden">Starts with: </span>
                  {row.nexfiy}
                </span>
              </p>
              <p className="text-muted-foreground text-sm leading-6">
                <span>
                  <span className="font-semibold sm:hidden">Enables: </span>
                  {row.typical}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
