import posthog from "posthog-js";

type AnalyticsEvents = {
  auth_started: {
    method: "email" | "google" | "apple";
    mode: "sign-in" | "sign-up";
  };
  auth_succeeded: { method: "email"; mode: "sign-in" | "sign-up" };
  auth_failed: {
    method: "email" | "google" | "apple";
    mode: "sign-in" | "sign-up";
  };
  landing_cta_clicked: { destination: "pricing" | "features" | "workspace" };
  workspace_search_opened: { source: "keyboard" | "dialog" };
  workspace_search_result_selected: Record<string, never>;
  document_viewed: { kind: "document" | "database" };
};

export const captureEvent = <EventName extends keyof AnalyticsEvents>(
  event: EventName,
  properties: AnalyticsEvents[EventName],
) => {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
};
