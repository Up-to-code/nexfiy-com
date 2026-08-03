import { useSyncExternalStore } from "react";

export const useOrigin = () => {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "";

  if (!mounted) {
    return "";
  }

  return origin;
};
