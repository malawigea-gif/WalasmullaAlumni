import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Child } from "../types";

const emptyForm = {
  fullName: "",
  nameWithInitials: "",
  dateOfBirth: "",
  nicNumber: "",
  permanentAddress: "",
  currentAddress: "",
  gramaNiladhariDivision: "",
  divisionalSecretariat: "",
  district: "",
  schoolPeriodFrom: "",
  schoolPeriodTo: "",
  academicAchievements: "",
  coCurricularAchievements: "",
  scholarshipExamResult: "not_applicable" as "passed" | "failed" | "not_applicable",
  leadershipRoles: "",
  extracurricularGroups: "",
  higherEducationQualifications: "",
  phone: "",
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [children, setChildren] = useState<Child[]>([]);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const p = user.profile;
    setForm({
      fullName: p?.fullName ?? "",
      nameWithInitials: p?.nameWithInitials ?? "",
      dateOfBirth: p?.dateOfBirth?.slice(0, 10) ?? "",
      nicNumber: p?.nicNumber ?? "",
      permanentAddress: p?.permanentAddress ?? "",
      currentAddress: p?.currentAddress ?? "",
      gramaNiladhariDivision: p?.gramaNiladhariDivision ?? "",
      divisionalSecretariat: p?.divisionalSecretariat ?? "",
      district: p?.district ?? "",
      schoolPeriodFrom: p?.schoolPeriodFrom?.toString() ?? "",
      schoolPeriodTo: p?.schoolPeriodTo?.toString() ?? "",
      academicAchievements: p?.academicAchievements ?? "",
      coCurricularAchievements: p?.coCurricularAchievements ?? "",
      scholarshipExamResult: p?.scholarshipExamResult ?? "not_applicable",
      leadershipRoles: p?.leadershipRoles ?? "",
      extracurricularGroups: p?.extracurricularGroups ?? "",
      higherEducationQualifications: p?.higherEducationQualifications ?? "",
      phone: user.phone ?? "",
    });
    setChildren(user.children ?? []);
  }, [user]);

  function field(name: keyof typeof form) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/profile/me", {
        ...form,
        schoolPeriodFrom: form.schoolPeriodFrom ? Number(form.schoolPeriodFrom) : null,
        schoolPeriodTo: form.schoolPeriodTo ? Number(form.schoolPeriodTo) : null,
        dateOfBirth: form.dateOfBirth || null,
      });
      await refreshUser();
      setMessage(t("common.save") + " ✓");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddChild(e: FormEvent) {
    e.preventDefault();
    if (!user || !newChildName.trim()) return;
    const { data } = await api.post(`/members/${user.id}/children`, {
      name: newChildName,
      dateOfBirth: newChildDob || null,
    });
    setChildren((c) => [...c, data]);
    setNewChildName("");
    setNewChildDob("");
  }

  async function handleRemoveChild(childId: string) {
    if (!user) return;
    await api.delete(`/members/${user.id}/children/${childId}`);
    setChildren((c) => c.filter((child) => child.id !== childId));
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post("/profile/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordMessage(t("profile.passwordChanged"));
    } catch (err: any) {
      setPasswordError(err.response?.data?.error ?? t("profile.passwordChangeFailed"));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    await api.post("/profile/me/photo", formData, { headers: { "Content-Type": "multipart/form-data" } });
    await refreshUser();
  }

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("profile.title")}</h1>

      <div className="mb-6 flex items-center gap-4">
        {user.profile?.profilePhotoUrl ? (
          <img src={user.profile.profilePhotoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800">
            ?
          </div>
        )}
        <div>
          <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">
            {t("profile.uploadPhoto")}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      {message && <p className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-800">{message}</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Text label={t("auth.fullName")} {...field("fullName")} />
        <Text label={t("auth.nameWithInitials")} {...field("nameWithInitials")} />
        <Text label={t("auth.phone")} {...field("phone")} />
        <Text label={t("profile.dateOfBirth")} type="date" {...field("dateOfBirth")} />
        <Text label={t("profile.nic")} {...field("nicNumber")} />
        <Text label={t("common.district")} {...field("district")} />
        <Text label={t("profile.gramaNiladhari")} {...field("gramaNiladhariDivision")} />
        <Text label={t("profile.divisionalSecretariat")} {...field("divisionalSecretariat")} />
        <Text label={t("profile.permanentAddress")} {...field("permanentAddress")} />
        <Text label={t("profile.currentAddress")} {...field("currentAddress")} />
        <Text label={`${t("profile.schoolPeriod")} (${t("common.from")})`} type="number" {...field("schoolPeriodFrom")} />
        <Text label={`${t("profile.schoolPeriod")} (${t("common.to")})`} type="number" {...field("schoolPeriodTo")} />

        <div>
          <label className="block text-sm font-medium">{t("profile.scholarshipExam")}</label>
          <select
            {...field("scholarshipExamResult")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="not_applicable">{t("profile.scholarship.not_applicable")}</option>
            <option value="passed">{t("profile.scholarship.passed")}</option>
            <option value="failed">{t("profile.scholarship.failed")}</option>
          </select>
        </div>

        <TextArea label={t("profile.academicAchievements")} {...field("academicAchievements")} full />
        <TextArea label={t("profile.coCurricularAchievements")} {...field("coCurricularAchievements")} full />
        <TextArea label={t("profile.leadershipRoles")} {...field("leadershipRoles")} full />
        <TextArea label={t("profile.extracurricularGroups")} {...field("extracurricularGroups")} full />
        <TextArea label={t("profile.higherEducation")} {...field("higherEducationQualifications")} full />

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t("common.save")}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">{t("profile.children")}</h2>
        <ul className="mb-3 divide-y divide-slate-200 dark:divide-slate-800">
          {children.map((child) => (
            <li key={child.id} className="flex items-center justify-between py-2">
              <span>
                {child.name} {child.dateOfBirth ? `(${child.dateOfBirth.slice(0, 10)})` : ""}
              </span>
              <button onClick={() => handleRemoveChild(child.id)} className="text-sm text-red-600 hover:underline">
                {t("common.delete")}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddChild} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-sm font-medium">{t("profile.childName")}</label>
            <input
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("profile.dateOfBirth")}</label>
            <input
              type="date"
              value={newChildDob}
              onChange={(e) => setNewChildDob(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t("profile.addChild")}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">{t("profile.changePassword")}</h2>
        {passwordMessage && <p className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-800">{passwordMessage}</p>}
        {passwordError && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{passwordError}</p>}
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4 sm:max-w-md">
          <div>
            <label className="block text-sm font-medium">{t("profile.currentPassword")}</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("profile.newPassword")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("profile.confirmNewPassword")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {t("profile.changePassword")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Text({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  );
}
