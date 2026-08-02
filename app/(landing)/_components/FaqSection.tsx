import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What can I build in Nexfiy?",
    answer:
      "You can create connected documents, team knowledge bases, relational databases, project hubs, reusable templates, and agent-assisted workflows in the same workspace.",
  },
  {
    question: "How do AI agents access my workspace?",
    answer:
      "You create a dedicated MCP client environment in Workspace settings. Each environment has its own revocable URL, so access stays visible and under your control.",
  },
  {
    question: "Can I use Nexfiy as a content source for another website?",
    answer:
      "Yes. The read-only Content API lets you select specific databases and fetch their schema, records, properties, and normalized page blocks from a trusted server.",
  },
  {
    question: "Does it support teams and personal workspaces?",
    answer:
      "Yes. Personal notes stay separate, while organization workspaces support members, roles, shared billing, and collaborative content.",
  },
  {
    question: "Will my documents and databases update in real time?",
    answer:
      "Yes. Workspace data is backed by Convex, so connected views update as changes happen without manual polling or refresh workflows.",
  },
  {
    question: "Can I import links, YouTube videos, and GitHub repositories?",
    answer:
      "Yes. The editor includes labeled link cards, YouTube embeds, GitHub repository cards, files, images, and database views alongside regular document blocks.",
  },
  {
    question: "Where can developers find the API and MCP reference?",
    answer:
      "The public developer documentation includes quickstarts, endpoint payloads, block rendering examples, MCP tools, and downloadable Markdown guides.",
  },
] as const;

export const FaqSection = () => {
  return (
    <section id="faq" className="bg-background text-foreground py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-8">
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-bold tracking-[0.18em] uppercase">
            Frequently asked
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Clear answers before you start.
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            Learn more in the public developer docs or begin with a personal
            workspace and invite your team later.
          </p>
        </div>

        <div className="divide-border/60 border-border/60 divide-y border-y">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-semibold marker:content-none">
                <span>{faq.question}</span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="text-muted-foreground max-w-2xl pr-10 pb-5 text-sm leading-7">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
