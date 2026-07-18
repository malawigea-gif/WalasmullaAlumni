import { useTranslation } from "react-i18next";

export function ConfirmationBadge({ confirmedAt }: { confirmedAt: string | null }) {
  const { t } = useTranslation();

  if (confirmedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
        {t("common.confirmed")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      {t("common.pending")}
    </span>
  );
}
