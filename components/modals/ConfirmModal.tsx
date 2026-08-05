"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface ConfirmmModalProps {
  children: React.ReactNode;
  onConfirm: () => void;
}
export const ConfirmModal = ({ children, onConfirm }: ConfirmmModalProps) => {
  const { t } = useI18n();
  const handleConfirm = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.stopPropagation();
    onConfirm();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger onClick={(e) => e.stopPropagation()} asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="dark:bg-dark">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogs.confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
            {t("dialogs.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            {t("dialogs.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
