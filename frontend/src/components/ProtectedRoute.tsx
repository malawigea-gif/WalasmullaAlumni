import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export function ProtectedRoute({
  executiveOnly = false,
  adminOnly = false,
}: {
  executiveOnly?: boolean;
  adminOnly?: boolean;
}) {
  const { user, loading, isElevated } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t("common.loading")}</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (executiveOnly && !isElevated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
