const workflowSteps: Array<{
  number: string;
  title: string;
  description: string;
}> = [
  {
    number: "01",
    title: "Capture",
    description: "Write a page or bring in a file, link, video, or repository.",
  },
  {
    number: "02",
    title: "Structure",
    description: "Use a database when the content needs properties and views.",
  },
  {
    number: "03",
    title: "Connect",
    description: "Relate pages and records so context stays close to the work.",
  },
  {
    number: "04",
    title: "Act",
    description: "Publish selected data through an API or connect it over MCP.",
  },
];

export const WorkflowSection = () => {
  return (
    <section
      id="workflow"
      className="border-border/40 bg-muted/20 text-foreground border-y py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-3xl">
          <p className="text-muted-foreground mb-3 text-xs font-bold tracking-[0.18em] uppercase">
            One connected loop
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Start with a page. Add structure as the work grows.
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            The workspace stays simple for writing while databases, APIs, and
            MCP remain available when the job needs them.
          </p>
        </div>

        <ol className="border-border grid border-y md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => {
            return (
              <li
                key={step.number}
                className={`border-border px-5 py-8 sm:px-7 sm:py-10 ${
                  index < workflowSteps.length - 1 ? "border-b" : ""
                } ${index % 2 === 0 ? "md:border-r" : ""} ${
                  index < 2 ? "md:border-b" : "md:border-b-0"
                } ${index > 0 ? "xl:border-l" : ""} xl:border-r-0 xl:border-b-0`}
              >
                <span className="text-muted-foreground font-mono text-xs">
                  {step.number}
                </span>
                <span className="mt-8 mb-5 block h-px w-8 bg-[#2383e2]" />
                <h3 className="text-xl font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
