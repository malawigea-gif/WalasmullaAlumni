import { useTranslation } from "react-i18next";

export function ConfirmationBadge({ confirmedAt }: { confirmedAt: string | null }) {
  const { t } = useTranslation();

  if (confirmedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
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
