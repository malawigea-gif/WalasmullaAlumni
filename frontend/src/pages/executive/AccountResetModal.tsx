import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";

export default function AccountResetModal({
  resetId,
  onClose,
  onApplied,
}: {
  resetId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { t } = useTranslation();
  const [openingCashBalance, setOpeningCashBalance] = useState("");
  const [openingBankBalance, setOpeningBankBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/accounts/reset-requests/${resetId}/apply`, {
        openingCashBalance: Number(openingCashBalance || 0),
        openingBankBalance: Number(openingBankBalance || 0),
      });
      onApplied();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to apply account reset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("accounts.reset.openingBalanceTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("common.close")}
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">{t("accounts.reset.openingBalanceNote")}</p>

        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">{t("accounts.reset.openingCashBalance")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={openingCashBalance}
              onChange={(e) => setOpeningCashBalance(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("accounts.reset.openingBankBalance")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={openingBankBalance}
              onChange={(e) => setOpeningBankBalance(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t("accounts.reset.applyReset")}
          </button>
        </form>
      </div>
    </div>
  );
}
