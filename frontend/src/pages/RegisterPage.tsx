import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    nameWithInitials: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function updateField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        nameWithInitials: form.nameWithInitials,
        phone: form.phone || undefined,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        <h1 className="mb-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">{t("app.name")}</h1>
        <h2 className="mb-4 text-xl font-semibold">{t("auth.register")}</h2>
        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label={t("auth.fullName")} value={form.fullName} onChange={updateField("fullName")} required />
          <Field
            label={t("auth.nameWithInitials")}
            value={form.nameWithInitials}
            onChange={updateField("nameWithInitials")}
            required
          />
          <Field label={t("auth.email")} type="email" value={form.email} onChange={updateField("email")} required />
          <Field label={t("auth.phone")} value={form.phone} onChange={updateField("phone")} />
          <Field
            label={t("auth.password")}
            type="password"
            value={form.password}
            onChange={updateField("password")}
            required
          />
          <Field
            label={t("auth.confirmPassword")}
            type="password"
            value={form.confirmPassword}
            onChange={updateField("confirmPassword")}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {t("auth.registerButton")}
          </button>
        </form>
        <div className="mt-4 text-sm">
          <Link to="/login" className="text-emerald-700 dark:text-emerald-400">
            {t("auth.haveAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  );
}
