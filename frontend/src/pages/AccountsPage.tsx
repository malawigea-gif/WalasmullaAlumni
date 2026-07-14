import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { AccountEntry } from "../types";

export default function AccountsPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/accounts/entries").then(({ data }) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t("accounts.title")}</h1>
      <p className="mb-4 text-sm text-slate-500">{t("accounts.memberViewNote")}</p>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-500">{t("common.none")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.date")}</th>
              <th className="py-2">{t("accounts.type")}</th>
              <th className="py-2">{t("common.description")}</th>
              <th className="py-2">{t("common.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{new Date(e.entryDate).toLocaleDateString()}</td>
                <td className="py-2">
                  <span
                    className={
                      e.type === "income"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }
                  >
                    {t(`accounts.types.${e.type}`)}
                  </span>
                </td>
                <td className="py-2">{e.description}</td>
                <td className="py-2">Rs. {e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
