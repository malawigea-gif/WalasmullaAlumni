import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { printReceipt } from "../../lib/receipt";
import type { AccountEntry, AccountEntryCategory } from "../../types";

type PosSelection = AccountEntryCategory | "expense";

const TILES: PosSelection[] = ["membership_fee", "donation", "other_income", "expense"];

const RECEIPT_TITLE_KEY: Record<PosSelection, string> = {
  membership_fee: "receipt.feeTitle",
  donation: "receipt.donationTitle",
  other_income: "receipt.otherIncomeTitle",
  bank_interest: "receipt.otherIncomeTitle",
  expense: "receipt.voucherTitle",
};

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function PosEntryModal({
  entries,
  onClose,
  onSaved,
}: {
  entries: AccountEntry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [selection, setSelection] = useState<PosSelection>("membership_fee");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(todayDateInput());
  const [issueReceipt, setIssueReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIncome = selection !== "expense";

  const todaysEntries = entries
    .filter((e) => e.recordedBy === user?.id && e.entryDate.slice(0, 10) === todayDateInput())
    .slice(0, 8);

  function printPosReceipt(entry: { id: string; entryDate: string; amount: string }) {
    printReceipt({
      associationName: t("app.name"),
      title: t(RECEIPT_TITLE_KEY[selection]),
      receiptNoLabel: t("receipt.no"),
      receiptNo: entry.id.slice(-8).toUpperCase(),
      dateLabel: t("receipt.date"),
      date: new Date(entry.entryDate).toLocaleDateString(),
      lines: [
        { label: t("receipt.category"), value: isIncome ? t(`accounts.categories.${selection}`) : t("accounts.types.expense") },
        { label: t("receipt.description"), value: description },
      ],
      amountLabel: t("receipt.amount"),
      amount: `Rs. ${entry.amount}`,
      issuedByLabel: t("receipt.issuedBy"),
      issuedBy: user?.profile?.fullName ?? user?.email ?? "-",
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await api.post("/accounts/entries", {
        type: isIncome ? "income" : "expense",
        category: isIncome ? selection : undefined,
        description,
        amount: Number(amount),
        entryDate,
        receiptIssued: isIncome && issueReceipt,
      });

      if (issueReceipt) {
        printPosReceipt(data);
      }

      setDescription("");
      setAmount("");
      setEntryDate(todayDateInput());
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("accounts.pos.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("common.close")}
          </button>
        </div>

        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mb-4 grid grid-cols-2 gap-2">
          {TILES.map((tile) => (
            <button
              key={tile}
              type="button"
              onClick={() => setSelection(tile)}
              className={`rounded-lg border p-4 text-center text-sm font-semibold transition ${
                selection === tile
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              {tile === "expense" ? t("accounts.types.expense") : t(`accounts.categories.${tile}`)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">{t("common.description")}</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">{t("common.amount")}</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-lg font-semibold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t("common.date")}</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={issueReceipt} onChange={(e) => setIssueReceipt(e.target.checked)} />
            {t("accounts.pos.issueReceipt")}
          </label>
          {isIncome && issueReceipt && (
            <p className="text-xs text-slate-500">{t("accounts.pos.receiptSkipsApproval")}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {issueReceipt ? t("accounts.pos.saveAndPrint") : t("accounts.addEntry")}
          </button>
        </form>

        {todaysEntries.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{t("accounts.pos.todaysEntries")}</h3>
            <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {todaysEntries.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-1.5">
                  <span className="truncate pr-2">{e.description}</span>
                  <span className={e.type === "income" ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}>
                    Rs. {e.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
