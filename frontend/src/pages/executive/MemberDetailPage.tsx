import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { ConfirmationBadge } from "../../components/ConfirmationBadge";
import type { Donation, FeePayment, LabourContribution, MeetingAttendance, Member } from "../../types";

export default function MemberDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [contributions, setContributions] = useState<LabourContribution[]>([]);
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);

  const [profileForm, setProfileForm] = useState({ fullName: "", nameWithInitials: "", district: "", phone: "" });
  const [feeForm, setFeeForm] = useState({ amount: "", year: new Date().getFullYear().toString() });
  const [donationForm, setDonationForm] = useState({ description: "", amount: "" });
  const [labourForm, setLabourForm] = useState({ description: "", hours: "" });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function loadAll() {
    if (!id) return;
    const [memberRes, feesRes, donationsRes, labourRes, attendanceRes] = await Promise.all([
      api.get(`/members/${id}`),
      api.get(`/members/${id}/fee-payments`),
      api.get(`/members/${id}/donations`),
      api.get(`/members/${id}/labour-contributions`),
      api.get(`/members/${id}/attendance`),
    ]);
    setMember(memberRes.data);
    setProfileForm({
      fullName: memberRes.data.profile?.fullName ?? "",
      nameWithInitials: memberRes.data.profile?.nameWithInitials ?? "",
      district: memberRes.data.profile?.district ?? "",
      phone: memberRes.data.phone ?? "",
    });
    setPayments(feesRes.data);
    setDonations(donationsRes.data);
    setContributions(labourRes.data);
    setAttendance(attendanceRes.data);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    await api.put(`/members/${id}`, profileForm);
    setSaveMessage(t("common.save") + " ✓");
    await loadAll();
  }

  async function handleAddFee(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    await api.post(`/members/${id}/fee-payments`, { amount: Number(feeForm.amount), year: Number(feeForm.year) });
    setFeeForm({ amount: "", year: new Date().getFullYear().toString() });
    await loadAll();
  }

  async function handleAddDonation(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    await api.post(`/members/${id}/donations`, {
      description: donationForm.description,
      amount: donationForm.amount ? Number(donationForm.amount) : undefined,
    });
    setDonationForm({ description: "", amount: "" });
    await loadAll();
  }

  async function handleAddLabour(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    await api.post(`/members/${id}/labour-contributions`, {
      description: labourForm.description,
      hours: labourForm.hours ? Number(labourForm.hours) : undefined,
    });
    setLabourForm({ description: "", hours: "" });
    await loadAll();
  }

  async function handleConfirmFee(paymentId: string) {
    if (!id) return;
    await api.patch(`/members/${id}/fee-payments/${paymentId}/confirm`);
    await loadAll();
  }

  async function handleConfirmDonation(donationId: string) {
    if (!id) return;
    await api.patch(`/members/${id}/donations/${donationId}/confirm`);
    await loadAll();
  }

  async function handleConfirmLabour(contributionId: string) {
    if (!id) return;
    await api.patch(`/members/${id}/labour-contributions/${contributionId}/confirm`);
    await loadAll();
  }

  async function handleConfirmAttendance(attendanceId: string) {
    if (!id) return;
    await api.patch(`/members/${id}/attendance/${attendanceId}/confirm`);
    await loadAll();
  }

  if (!member) return <p>{t("common.loading")}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold">{member.profile?.fullName ?? member.email}</h1>
        <p className="text-sm text-slate-500">{member.email}</p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("profile.title")}</h2>
        {saveMessage && <p className="mb-2 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{saveMessage}</p>}
        <form onSubmit={handleProfileSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledInput
            label={t("auth.fullName")}
            value={profileForm.fullName}
            onChange={(v) => setProfileForm((f) => ({ ...f, fullName: v }))}
          />
          <LabeledInput
            label={t("auth.nameWithInitials")}
            value={profileForm.nameWithInitials}
            onChange={(v) => setProfileForm((f) => ({ ...f, nameWithInitials: v }))}
          />
          <LabeledInput
            label={t("common.district")}
            value={profileForm.district}
            onChange={(v) => setProfileForm((f) => ({ ...f, district: v }))}
          />
          <LabeledInput
            label={t("auth.phone")}
            value={profileForm.phone}
            onChange={(v) => setProfileForm((f) => ({ ...f, phone: v }))}
          />
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
              {t("common.save")}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("fees.title")}</h2>
        <form onSubmit={handleAddFee} className="mb-3 flex flex-wrap items-end gap-2">
          <LabeledInput
            label={t("common.amount")}
            type="number"
            value={feeForm.amount}
            onChange={(v) => setFeeForm((f) => ({ ...f, amount: v }))}
            required
          />
          <LabeledInput
            label={t("common.year")}
            type="number"
            value={feeForm.year}
            onChange={(v) => setFeeForm((f) => ({ ...f, year: v }))}
            required
          />
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {t("fees.recordPayment")}
          </button>
        </form>
        <SimpleTable
          rows={payments}
          columns={[
            { header: t("common.year"), render: (p) => p.year },
            { header: t("common.amount"), render: (p) => `Rs. ${p.amount}` },
            { header: t("fees.paidDate"), render: (p) => new Date(p.paidDate).toLocaleDateString() },
            {
              header: t("common.status"),
              render: (p) => <ConfirmCell confirmedAt={p.confirmedAt} onConfirm={() => handleConfirmFee(p.id)} />,
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("donations.title")}</h2>
        <form onSubmit={handleAddDonation} className="mb-3 flex flex-wrap items-end gap-2">
          <LabeledInput
            label={t("common.description")}
            value={donationForm.description}
            onChange={(v) => setDonationForm((f) => ({ ...f, description: v }))}
            required
          />
          <LabeledInput
            label={t("common.amount")}
            type="number"
            value={donationForm.amount}
            onChange={(v) => setDonationForm((f) => ({ ...f, amount: v }))}
          />
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {t("donations.recordDonation")}
          </button>
        </form>
        <SimpleTable
          rows={donations}
          columns={[
            { header: t("common.description"), render: (d) => d.description },
            { header: t("common.amount"), render: (d) => (d.amount ? `Rs. ${d.amount}` : "-") },
            { header: t("donations.donatedDate"), render: (d) => new Date(d.donatedDate).toLocaleDateString() },
            {
              header: t("common.status"),
              render: (d) => <ConfirmCell confirmedAt={d.confirmedAt} onConfirm={() => handleConfirmDonation(d.id)} />,
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("labour.title")}</h2>
        <form onSubmit={handleAddLabour} className="mb-3 flex flex-wrap items-end gap-2">
          <LabeledInput
            label={t("common.description")}
            value={labourForm.description}
            onChange={(v) => setLabourForm((f) => ({ ...f, description: v }))}
            required
          />
          <LabeledInput
            label={t("labour.hours")}
            type="number"
            value={labourForm.hours}
            onChange={(v) => setLabourForm((f) => ({ ...f, hours: v }))}
          />
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {t("labour.recordContribution")}
          </button>
        </form>
        <SimpleTable
          rows={contributions}
          columns={[
            { header: t("common.description"), render: (c) => c.description },
            { header: t("labour.hours"), render: (c) => c.hours ?? "-" },
            { header: t("common.date"), render: (c) => new Date(c.date).toLocaleDateString() },
            {
              header: t("common.status"),
              render: (c) => <ConfirmCell confirmedAt={c.confirmedAt} onConfirm={() => handleConfirmLabour(c.id)} />,
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("attendance.title")}</h2>
        <SimpleTable
          rows={attendance}
          columns={[
            { header: t("attendance.meeting"), render: (a) => a.meeting?.title ?? "-" },
            { header: t("attendance.scannedAt"), render: (a) => new Date(a.scannedAt).toLocaleString() },
            {
              header: t("common.status"),
              render: (a) => <ConfirmCell confirmedAt={a.confirmedAt} onConfirm={() => handleConfirmAttendance(a.id)} />,
            },
          ]}
        />
      </section>
    </div>
  );
}

function ConfirmCell({ confirmedAt, onConfirm }: { confirmedAt: string | null; onConfirm: () => void }) {
  const { t } = useTranslation();
  if (confirmedAt) return <ConfirmationBadge confirmedAt={confirmedAt} />;
  return (
    <button
      type="button"
      onClick={onConfirm}
      className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
    >
      {t("common.confirm")}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  );
}

function SimpleTable<T extends { id: string }>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { header: string; render: (row: T) => React.ReactNode }[];
}) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800">
          {columns.map((c) => (
            <th key={c.header} className="py-2">
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/50">
            {columns.map((c) => (
              <td key={c.header} className="py-2">
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
