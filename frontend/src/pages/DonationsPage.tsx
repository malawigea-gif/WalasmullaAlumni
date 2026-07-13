import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Donation } from "../types";

export default function DonationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await api.get(`/members/${user.id}/donations`);
    setDonations(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    await api.post(`/members/${user.id}/donations`, {
      description,
      amount: amount ? Number(amount) : undefined,
    });
    setDescription("");
    setAmount("");
    await load();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("donations.title")}</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium">{t("common.description")}</label>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">{t("common.amount")}</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
          {t("donations.recordDonation")}
        </button>
      </form>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.description")}</th>
              <th className="py-2">{t("common.amount")}</th>
              <th className="py-2">{t("donations.donatedDate")}</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{d.description}</td>
                <td className="py-2">{d.amount ? `Rs. ${d.amount}` : "-"}</td>
                <td className="py-2">{new Date(d.donatedDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
