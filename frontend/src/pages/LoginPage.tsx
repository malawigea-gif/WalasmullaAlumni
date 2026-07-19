import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import associationCrest from "../assets/association-crest.jpg";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={associationCrest} alt="" className="h-10 w-10 rounded-full" />
            <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400">{t("app.name")}</h1>
          </div>
          <button
            onClick={() => i18n.changeLanguage(i18n.language === "si" ? "en" : "si")}
            className="text-xs text-slate-500 underline"
          >
            {i18n.language === "si" ? "English" : "සිංහල"}
          </button>
        </div>
        <h2 className="mb-4 text-xl font-semibold">{t("auth.login")}</h2>
        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
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
          <div>
            <label className="block text-sm font-medium">{t("auth.password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t("auth.loginButton")}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-blue-700 dark:text-blue-400">
            {t("auth.forgotPassword")}
          </Link>
          <Link to="/register" className="text-blue-700 dark:text-blue-400">
            {t("auth.noAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
