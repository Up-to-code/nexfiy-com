"use client";

import { SettingsModal } from "@/components/modals/SettingsModal";
import { CoverImageModal } from "@/components/modals/CoverImageModal";

export const ModalProvider = () => {
  return (
    <>
      <SettingsModal />
      <CoverImageModal />
    </>
  );
};
