import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { printReceipt } from "../../lib/receipt";
import { INCOME_CATEGORIES, MEMBER_LINKED_INCOME_CATEGORIES, PAYMENT_METHODS } from "../../lib/accountCategories";
import type { AccountEntry, AccountEntryCategory, PaymentMethod } from "../../types";

type PosSelection = AccountEntryCategory | "expense";

const TILES: PosSelection[] = [...INCOME_CATEGORIES, "expense"];

const RECEIPT_TITLE_KEY: Record<PosSelection, string> = {
  membership_fee: "receipt.feeTitle",
  aid: "receipt.aidTitle",
  fine: "receipt.fineTitle",
  bank_interest: "receipt.bankInterestTitle",
  other: "receipt.otherIncomeTitle",
  petty_cash: "receipt.voucherTitle",
  project: "receipt.voucherTitle",
  bank_payment: "receipt.voucherTitle",
  expense: "receipt.voucherTitle",
};

/** The POS "expense" tile always records a petty-cash expense (quick point-of-sale use case). */
const POS_EXPENSE_CATEGORY: AccountEntryCategory = "petty_cash";

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [issueReceipt, setIssueReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [membershipNoInput, setMembershipNoInput] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [memberLookupError, setMemberLookupError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const isIncome = selection !== "expense";
  const requiresMember = isIncome && MEMBER_LINKED_INCOME_CATEGORIES.includes(selection as AccountEntryCategory);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function lookupByMembershipNo(e: FormEvent) {
    e.preventDefault();
    setMemberLookupError(null);
    if (!membershipNoInput.trim()) return;
    try {
      const { data } = await api.get(`/members/by-membership-no/${encodeURIComponent(membershipNoInput.trim())}`);
      await resolveMember(data.memberId);
    } catch (err: any) {
      setMemberLookupError(err.response?.data?.error ?? "Member not found");
    }
  }

  async function resolveMember(memberId: string) {
    const { data } = await api.get(`/members/${memberId}`);
    setSelectedMember({ id: data.id, name: data.profile?.fullName ?? data.email });
    setMembershipNoInput("");
  }

  async function handleScanSuccess(decodedText: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { data } = await api.get(`/members/by-qr/${encodeURIComponent(decodedText)}`);
      await stopScanning();
      await resolveMember(data.memberId);
    } catch (err: any) {
      setMemberLookupError(err.response?.data?.error ?? "Scan failed");
      busyRef.current = false;
    }
  }

  async function startScanning() {
    setMemberLookupError(null);
    const scanner = new Html5Qrcode("pos-member-qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        handleScanSuccess,
        undefined
      );
      setScanning(true);
    } catch {
      setMemberLookupError(t("scanner.cameraPermission"));
    }
  }

  async function stopScanning() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
    busyRef.current = false;
  }

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
    if (requiresMember && !selectedMember) {
      setError(t("accounts.pos.memberRequired"));
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/accounts/entries", {
        type: isIncome ? "income" : "expense",
        category: isIncome ? selection : POS_EXPENSE_CATEGORY,
        paymentMethod,
        description,
        amount: Number(amount),
        entryDate,
        receiptIssued: isIncome && issueReceipt,
        memberId: isIncome ? selectedMember?.id : undefined,
      });

      if (issueReceipt) {
        printPosReceipt(data);
      }

      setDescription("");
      setAmount("");
      setEntryDate(todayDateInput());
      setSelectedMember(null);
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

        {requiresMember && (
          <div className="mb-4 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{t("accounts.pos.selectMember")}</h3>
            {selectedMember ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selectedMember.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-blue-700 hover:underline dark:text-blue-400"
                >
                  {t("accounts.pos.changeMember")}
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={lookupByMembershipNo} className="flex gap-2">
                  <input
                    value={membershipNoInput}
                    onChange={(e) => setMembershipNoInput(e.target.value)}
                    placeholder={t("membershipNo.label") ?? ""}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    {t("common.search")}
                  </button>
                  {!scanning ? (
                    <button
                      type="button"
                      onClick={startScanning}
                      className="rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                    >
                      {t("members.scanQr")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopScanning}
                      className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      {t("scanner.stopScanning")}
                    </button>
                  )}
                </form>
                {memberLookupError && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{memberLookupError}</p>}
                {scanning && <div id="pos-member-qr-reader" className="mx-auto mt-3 max-w-xs" />}
              </>
            )}
          </div>
        )}

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

          <div>
            <label className="block text-sm font-medium">{t("accounts.paymentMethod")}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {t(`accounts.paymentMethods.${pm}`)}
                </option>
              ))}
            </select>
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
