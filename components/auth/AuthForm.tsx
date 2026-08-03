"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { captureEvent } from "@/lib/analytics";

export const AuthForm = ({
  mode,
  callbackUrl = "/documents",
}: {
  mode: "sign-in" | "sign-up";
  callbackUrl?: string;
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<
    "apple" | "google" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";
  const safeCallbackUrl =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/documents";

  const handleSocialSignIn = async (provider: "apple" | "google") => {
    captureEvent("auth_started", { method: provider, mode });
    setSocialProvider(provider);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: safeCallbackUrl,
        disableRedirect: true,
      });

      if (result.error) {
        captureEvent("auth_failed", { method: provider, mode });
        const message =
          result.error.message || `Could not continue with ${provider}.`;
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      if (!result.data?.url) {
        throw new Error(`Missing ${provider} authorization URL.`);
      }

      window.location.assign(result.data.url);
    } catch {
      captureEvent("auth_failed", { method: provider, mode });
      const message = `We couldn't connect to ${provider}. Please try again.`;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSocialProvider(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "");
    captureEvent("auth_started", { method: "email", mode });

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        captureEvent("auth_failed", { method: "email", mode });
        const message = result.error.message || "Authentication failed";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      captureEvent("auth_succeeded", { method: "email", mode });
      router.push(safeCallbackUrl);
      router.refresh();
    } catch {
      captureEvent("auth_failed", { method: "email", mode });
      const message = "We couldn't reach the server. Please try again.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {isSignUp
            ? "Set up your account and start turning ideas into organized work."
            : "Enter your details to continue to your workspace."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="dark:bg-background dark:hover:bg-accent h-11 rounded-xl border-zinc-200 font-medium hover:bg-zinc-50 dark:border-zinc-700"
          disabled={isSubmitting || socialProvider !== null}
          onClick={() => handleSocialSignIn("google")}
        >
          {socialProvider === "google" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
              />
            </svg>
          )}
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="dark:bg-background dark:hover:bg-accent h-11 rounded-xl border-zinc-200 font-medium hover:bg-zinc-50 dark:border-zinc-700"
          disabled={isSubmitting || socialProvider !== null}
          onClick={() => handleSocialSignIn("apple")}
        >
          {socialProvider === "apple" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Image
              src="/apple-logo-black.svg"
              alt=""
              width={814}
              height={1000}
              className="h-4 w-auto dark:invert"
              aria-hidden="true"
            />
          )}
          Apple
        </Button>
      </div>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <div className="bg-border h-px flex-1" />
        <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
          Or continue with email
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Name
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              className="h-11 rounded-xl border-zinc-200 focus-visible:ring-blue-500 dark:border-zinc-700"
              autoFocus
              required
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 rounded-xl border-zinc-200 focus-visible:ring-blue-500 dark:border-zinc-700"
            autoFocus={!isSignUp}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
            className="h-11 rounded-xl border-zinc-200 focus-visible:ring-blue-500 dark:border-zinc-700"
            minLength={8}
            required
          />
        </div>
        {errorMessage && (
          <p
            className="text-destructive min-h-5 text-xs font-medium"
            role="status"
            aria-live="polite"
          >
            {errorMessage}
          </p>
        )}

        <Button
          className="h-11 w-full rounded-xl bg-[#2383e2] text-sm font-semibold text-white shadow-xs hover:bg-[#1d6fc2]"
          disabled={isSubmitting || socialProvider !== null}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Please wait
            </>
          ) : (
            <>
              {isSignUp ? "Create account" : "Sign in"}
              <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {isSignUp ? "Already have an account?" : "New to Nexfiy?"}{" "}
        <Link
          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          href={isSignUp ? "/sign-in" : "/sign-up"}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>

      {/* Legal Disclaimer Footer */}
      <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        By continuing, you agree to Nexfiy&apos;s{" "}
        <Link
          href="/terms"
          className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
};
