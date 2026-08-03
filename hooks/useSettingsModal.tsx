import { create } from "zustand";

type SettingsStore = {
  isOpen: boolean;
  tab:
    | "account"
    | "organization"
    | "people"
    | "billing"
    | "preferences"
    | "api"
    | "mcp";
  setTab: (tab: SettingsStore["tab"]) => void;
  action?: "create-workspace";
  onOpen: (
    tab?: SettingsStore["tab"],
    action?: SettingsStore["action"],
  ) => void;
  consumeAction: () => void;
  onClose: () => void;
};

export const useSettings = create<SettingsStore>((set) => ({
  isOpen: false,
  tab: "preferences",
  setTab: (tab) => set({ tab }),
  onOpen: (tab = "preferences", action) => set({ isOpen: true, tab, action }),
  consumeAction: () => set({ action: undefined }),
  onClose: () => set({ isOpen: false, action: undefined }),
}));
