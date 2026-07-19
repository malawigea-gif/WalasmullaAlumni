import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ConfirmationBadge } from "../components/ConfirmationBadge";
import type { Fine } from "../types";

export default function FinesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/members/${user.id}/fines`).then(({ data }) => {
      setFines(data);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("fines.title")}</h1>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : fines.length === 0 ? (
        <p className="text-slate-500">{t("common.none")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.description")}</th>
              <th className="py-2">{t("common.amount")}</th>
              <th className="py-2">{t("common.date")}</th>
              <th className="py-2">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{f.description}</td>
                <td className="py-2">Rs. {f.amount}</td>
                <td className="py-2">{new Date(f.fineDate).toLocaleDateString()}</td>
                <td className="py-2">
                  <ConfirmationBadge confirmedAt={f.confirmedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
