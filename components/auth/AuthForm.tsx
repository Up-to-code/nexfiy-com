"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const AuthForm = ({ mode }: { mode: "sign-in" | "sign-up" }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "");

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        const message = result.error.message || "Authentication failed";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      router.push("/documents");
      router.refresh();
    } catch {
      const message = "We couldn't reach the server. Please try again.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 space-y-3">
        <p className="text-muted-foreground text-sm font-medium">
          {isSignUp ? "Start your workspace" : "Welcome to Zotion"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground leading-6">
          {isSignUp
            ? "Set up your account and start turning ideas into organized work."
            : "Enter your details to continue to your workspace."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              className="h-11 rounded-lg"
              autoFocus
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 rounded-lg"
            autoFocus={!isSignUp}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
            className="h-11 rounded-lg"
            minLength={8}
            required
          />
        </div>
        <p
          className="text-destructive min-h-5 text-sm"
          role="status"
          aria-live="polite"
        >
          {errorMessage}
        </p>

        <Button className="h-11 w-full rounded-lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Please wait
            </>
          ) : (
            <>
              {isSignUp ? "Create account" : "Sign in"}
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        {isSignUp ? "Already have an account?" : "New to Zotion?"}{" "}
        <Link
          className="text-foreground font-medium underline-offset-4 hover:underline"
          href={isSignUp ? "/sign-in" : "/sign-up"}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
};
