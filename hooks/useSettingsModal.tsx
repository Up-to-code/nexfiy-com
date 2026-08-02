import { create } from "zustand";

type SettingsStore = {
  isOpen: boolean;
  tab: "account" | "organization" | "billing" | "preferences" | "api" | "mcp";
  setTab: (tab: SettingsStore["tab"]) => void;
  onOpen: (tab?: SettingsStore["tab"]) => void;
  onClose: () => void;
};

export const useSettings = create<SettingsStore>((set) => ({
  isOpen: false,
  tab: "preferences",
  setTab: (tab) => set({ tab }),
  onOpen: (tab = "preferences") => set({ isOpen: true, tab }),
  onClose: () => set({ isOpen: false }),
}));
