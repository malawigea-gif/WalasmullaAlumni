import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ConfirmationBadge } from "../components/ConfirmationBadge";
import type { LabourContribution } from "../types";

export default function LabourContributionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contributions, setContributions] = useState<LabourContribution[]>([]);
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await api.get(`/members/${user.id}/labour-contributions`);
    setContributions(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    await api.post(`/members/${user.id}/labour-contributions`, {
      description,
      hours: hours ? Number(hours) : undefined,
    });
    setDescription("");
    setHours("");
    await load();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("labour.title")}</h1>

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
          <label className="block text-sm font-medium">{t("labour.hours")}</label>
          <input
            type="number"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
          {t("labour.recordContribution")}
        </button>
      </form>

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
