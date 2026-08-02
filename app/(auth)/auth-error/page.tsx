import Link from "next/link";

const errorMessages: Record<string, { title: string; description: string }> = {
  state_mismatch: {
    title: "Your sign-in session expired",
    description:
      "The secure sign-in check could not be completed. Start again and keep this tab open until you return to Nexfiy.",
  },
  access_denied: {
    title: "Sign-in was cancelled",
    description:
      "No changes were made. You can return to sign in whenever you are ready.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const content =
    errorMessages[error ?? ""] ?? {
      title: "We couldn’t sign you in",
      description:
        "Something interrupted the sign-in flow. Please try again in a moment.",
    };

  return (
    <div className="border-border/70 border-t pt-8">
      <p className="text-muted-foreground text-sm">Nexfiy account</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
        {content.title}
      </h1>
      <p className="text-muted-foreground mt-4 text-sm leading-6">
        {content.description}
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/sign-in"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Return home
        </Link>
      </div>
      {error ? (
        <p className="text-muted-foreground/60 mt-10 font-mono text-[11px]">
          Reference: {error}
        </p>
      ) : null}
    </div>
  );
}
