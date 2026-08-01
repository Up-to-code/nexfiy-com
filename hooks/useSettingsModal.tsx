import { create } from "zustand";

type SettingsStore = {
  isOpen: boolean;
  tab: "account" | "preferences" | "mcp";
  setTab: (tab: "account" | "preferences" | "mcp") => void;
  onOpen: (tab?: "account" | "preferences" | "mcp") => void;
  onClose: () => void;
};

export const useSettings = create<SettingsStore>((set) => ({
  isOpen: false,
  tab: "preferences",
  setTab: (tab) => set({ tab }),
  onOpen: (tab = "preferences") => set({ isOpen: true, tab }),
  onClose: () => set({ isOpen: false }),
}));
