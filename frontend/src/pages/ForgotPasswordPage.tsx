import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-semibold">{t("auth.resetPassword")}</h2>
        {message ? (
          <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {t("auth.sendResetLink")}
            </button>
          </form>
        )}
        <div className="mt-4 text-sm">
          <Link to="/login" className="text-blue-700 dark:text-blue-400">
            {t("common.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
