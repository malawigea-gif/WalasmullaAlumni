import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ConfirmationBadge } from "../components/ConfirmationBadge";
import type { LabourContribution } from "../types";

export default function LabourContributionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contributions, setContributions] = useState<LabourContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/members/${user.id}/labour-contributions`).then(({ data }) => {
      setContributions(data);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("labour.title")}</h1>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.description")}</th>
              <th className="py-2">{t("labour.hours")}</th>
              <th className="py-2">{t("common.date")}</th>
              <th className="py-2">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{c.description}</td>
                <td className="py-2">{c.hours ?? "-"}</td>
                <td className="py-2">{new Date(c.date).toLocaleDateString()}</td>
                <td className="py-2">
                  <ConfirmationBadge confirmedAt={c.confirmedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
