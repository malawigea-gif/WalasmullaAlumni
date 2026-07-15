import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { printReceipt } from "../../lib/receipt";
import type { AccountEntry, AccountEntryCategory, AccountEntryType, BudgetLine } from "../../types";

const INCOME_CATEGORIES: AccountEntryCategory[] = ["membership_fee", "donation", "other_income", "bank_interest"];

export default function AccountsManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isTreasurer = user?.role === "executive" && user.executivePosition === "treasurer";

  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<AccountEntryType>("income");
  const [category, setCategory] = useState<AccountEntryCategory>("membership_fee");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [budgetLineId, setBudgetLineId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balance = entries
    .filter((e) => e.isFullyApproved)
    .reduce((sum, e) => sum + (e.type === "income" ? Number(e.amount) : -Number(e.amount)), 0);

  const incomeByCategory = INCOME_CATEGORIES.map((c) => ({
    category: c,
    total: entries
      .filter((e) => e.isFullyApproved && e.type === "income" && e.category === c)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  }));

  function openReleaseFunds() {
    setType("expense");
  }

  function openEnterBankInterest() {
    setType("income");
    setCategory("bank_interest");
  }

  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetPlannedAmount, setBudgetPlannedAmount] = useState("");
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear().toString());

  async function load() {
    const [entriesRes, budgetRes] = await Promise.all([api.get("/accounts/entries"), api.get("/accounts/budget-lines")]);
    setEntries(entriesRes.data);
    setBudgetLines(budgetRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/accounts/entries", {
        type,
        category: type === "income" ? category : undefined,
        description,
        amount: Number(amount),
        budgetLineId: type === "expense" && budgetLineId ? budgetLineId : undefined,
      });
      setDescription("");
      setAmount("");
      setBudgetLineId("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add entry");
    }
  }

  async function handleAddBudgetLine(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/accounts/budget-lines", {
        category: budgetCategory,
        plannedAmount: Number(budgetPlannedAmount),
        year: Number(budgetYear),
      });
      setBudgetCategory("");
      setBudgetPlannedAmount("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add budget line");
    }
  }

  async function handleApprove(entryId: string) {
    setError(null);
    try {
      await api.post(`/accounts/entries/${entryId}/approve`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to approve entry");
    }
  }

  function handlePrintVoucher(entry: AccountEntry) {
    printReceipt({
      associationName: t("app.name"),
      title: t("receipt.voucherTitle"),
      receiptNoLabel: t("receipt.no"),
      receiptNo: entry.id.slice(-8).toUpperCase(),
      dateLabel: t("receipt.date"),
      date: new Date(entry.entryDate).toLocaleDateString(),
      lines: [
        { label: t("receipt.category"), value: entry.budgetLine?.category ?? "-" },
        { label: t("receipt.description"), value: entry.description },
      ],
      amountLabel: t("receipt.amount"),
      amount: `Rs. ${entry.amount}`,
      issuedByLabel: t("receipt.issuedBy"),
      issuedBy: entry.recorder?.profile?.fullName ?? entry.recorder?.email ?? "-",
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t("accounts.manageTitle")}</h1>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500">{t("accounts.balance")}</div>
            <div className="mt-1 text-2xl font-semibold">Rs. {balance.toFixed(2)}</div>
          </div>
          {incomeByCategory.map((c) => (
            <div key={c.category} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500">{t(`accounts.categories.${c.category}`)}</div>
              <div className="mt-1 text-2xl font-semibold">Rs. {c.total.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {isTreasurer && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openReleaseFunds}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {t("accounts.releaseFunds")}
            </button>
            <button
              type="button"
              onClick={openEnterBankInterest}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {t("accounts.enterBankInterest")}
            </button>
          </div>
        )}

        {isTreasurer && (
          <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-sm font-medium">{t("accounts.type")}</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as AccountEntryType);
                  setBudgetLineId("");
                }}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="income">{t("accounts.types.income")}</option>
                <option value="expense">{t("accounts.types.expense")}</option>
              </select>
            </div>
            {type === "income" && (
              <div>
                <label className="block text-sm font-medium">{t("accounts.category")}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AccountEntryCategory)}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`accounts.categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="min-w-48 flex-1">
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
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            {type === "expense" && (
              <div>
                <label className="block text-sm font-medium">{t("accounts.budgetLine")}</label>
                <select
                  value={budgetLineId}
                  onChange={(e) => setBudgetLineId(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">{t("accounts.noBudgetLine")}</option>
                  {budgetLines.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.category} ({b.year}) — {t("accounts.remaining")}: Rs. {b.remaining}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
              {t("accounts.addEntry")}
            </button>
          </form>
        )}

        {loading ? (
          <p>{t("common.loading")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">{t("common.date")}</th>
                <th className="py-2">{t("accounts.type")}</th>
                <th className="py-2">{t("common.amount")}</th>
                <th className="py-2">{t("common.description")}</th>
                <th className="py-2">{t("accounts.recordedBy")}</th>
                <th className="py-2">{t("common.status")}</th>
                <th className="py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const approvalCount = entry.approvals?.length ?? 0;
                const alreadyApprovedByMe = entry.approvals?.some((a) => a.approverId === user?.id) ?? false;
                const isOwnEntry = entry.recordedBy === user?.id;
                const canApprove = !entry.isFullyApproved && !isOwnEntry && !alreadyApprovedByMe && !entry.budgetLineId;

                return (
                  <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">{new Date(entry.entryDate).toLocaleDateString()}</td>
                    <td className="py-2">
                      <span
                        className={
                          entry.type === "income"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400"
                        }
                      >
                        {t(`accounts.types.${entry.type}`)}
                      </span>
                    </td>
                    <td className="py-2">Rs. {entry.amount}</td>
                    <td className="py-2">
                      {entry.description}
                      {entry.budgetLine && (
                        <span className="ml-1 text-xs text-slate-500">({entry.budgetLine.category})</span>
                      )}
                      {entry.category && (
                        <span className="ml-1 text-xs text-slate-500">({t(`accounts.categories.${entry.category}`)})</span>
                      )}
                    </td>
                    <td className="py-2">{entry.recorder?.profile?.fullName ?? entry.recorder?.email ?? "-"}</td>
                    <td className="py-2">
                      {entry.isFullyApproved ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {t("common.confirmed")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {t("accounts.approvalCount", { count: approvalCount })}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {canApprove && (
                          <button
                            type="button"
                            onClick={() => handleApprove(entry.id)}
                            className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                          >
                            {t("accounts.approve")}
                          </button>
                        )}
                        {entry.budgetLineId && (
                          <button
                            type="button"
                            onClick={() => handlePrintVoucher(entry)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            {t("receipt.print")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">{t("accounts.budgetTitle")}</h2>

        {isTreasurer && (
          <form onSubmit={handleAddBudgetLine} className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-sm font-medium">{t("accounts.category")}</label>
              <input
                required
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t("accounts.plannedAmount")}</label>
              <input
                type="number"
                step="0.01"
                required
                value={budgetPlannedAmount}
                onChange={(e) => setBudgetPlannedAmount(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t("common.year")}</label>
              <input
                type="number"
                required
                value={budgetYear}
                onChange={(e) => setBudgetYear(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              {t("accounts.addBudgetLine")}
            </button>
          </form>
        )}

        {!loading && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">{t("common.year")}</th>
                <th className="py-2">{t("accounts.category")}</th>
                <th className="py-2">{t("accounts.plannedAmount")}</th>
                <th className="py-2">{t("accounts.spent")}</th>
                <th className="py-2">{t("accounts.remaining")}</th>
              </tr>
            </thead>
            <tbody>
              {budgetLines.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="py-2">{b.year}</td>
                  <td className="py-2">{b.category}</td>
                  <td className="py-2">Rs. {b.plannedAmount}</td>
                  <td className="py-2">Rs. {b.spent}</td>
                  <td className={`py-2 ${Number(b.remaining) < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    Rs. {b.remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
