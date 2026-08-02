import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const uiHost =
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com";

if (!projectToken || !host) {
  if (process.env.NODE_ENV !== "production")
    console.info(
      "PostHog analytics is disabled until its public environment variables are configured.",
    );
} else {
  posthog.init(projectToken, {
    api_host: host,
    ui_host: uiHost,
    defaults: "2026-05-30",
    capture_exceptions: true,
    person_profiles: "identified_only",
    debug: process.env.NODE_ENV === "development",
  });
}

export default posthog;
