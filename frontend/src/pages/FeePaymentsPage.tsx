import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ConfirmationBadge } from "../components/ConfirmationBadge";
import type { FeePayment } from "../types";

export default function FeePaymentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/members/${user.id}/fee-payments`).then(({ data }) => {
      setPayments(data);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("fees.title")}</h1>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.year")}</th>
              <th className="py-2">{t("common.amount")}</th>
              <th className="py-2">{t("fees.paidDate")}</th>
              <th className="py-2">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{p.year}</td>
                <td className="py-2">Rs. {p.amount}</td>
                <td className="py-2">{new Date(p.paidDate).toLocaleDateString()}</td>
                <td className="py-2">
                  <ConfirmationBadge confirmedAt={p.confirmedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
