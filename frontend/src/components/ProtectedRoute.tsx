import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export function ProtectedRoute({ executiveOnly = false }: { executiveOnly?: boolean }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t("common.loading")}</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (executiveOnly && user.role !== "executive") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
