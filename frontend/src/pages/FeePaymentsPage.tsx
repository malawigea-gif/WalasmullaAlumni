import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { FeePayment } from "../types";

export default function FeePaymentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await api.get(`/members/${user.id}/fee-payments`);
    setPayments(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    await api.post(`/members/${user.id}/fee-payments`, { amount: Number(amount), year: Number(year) });
    setAmount("");
    await load();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("fees.title")}</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm font-medium">{t("common.amount")}</label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">{t("common.year")}</label>
          <input
            type="number"
            required
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
          {t("fees.recordPayment")}
        </button>
      </form>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.year")}</th>
              <th className="py-2">{t("common.amount")}</th>
              <th className="py-2">{t("fees.paidDate")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{p.year}</td>
                <td className="py-2">Rs. {p.amount}</td>
                <td className="py-2">{new Date(p.paidDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
