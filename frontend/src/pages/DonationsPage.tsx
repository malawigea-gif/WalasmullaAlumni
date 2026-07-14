import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ConfirmationBadge } from "../components/ConfirmationBadge";
import type { Donation } from "../types";

export default function DonationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/members/${user.id}/donations`).then(({ data }) => {
      setDonations(data);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("donations.title")}</h1>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.description")}</th>
              <th className="py-2">{t("common.amount")}</th>
              <th className="py-2">{t("donations.donatedDate")}</th>
              <th className="py-2">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{d.description}</td>
                <td className="py-2">{d.amount ? `Rs. ${d.amount}` : "-"}</td>
                <td className="py-2">{new Date(d.donatedDate).toLocaleDateString()}</td>
                <td className="py-2">
                  <ConfirmationBadge confirmedAt={d.confirmedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
