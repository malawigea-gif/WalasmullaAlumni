import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export function ProtectedRoute({
  executiveOnly = false,
  adminOnly = false,
  execOrAdminOnly = false,
}: {
  executiveOnly?: boolean;
  adminOnly?: boolean;
  /** True executives and admins only — excludes members with an active delegation. */
  execOrAdminOnly?: boolean;
}) {
  const { user, loading, isElevated } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t("common.loading")}</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (executiveOnly && !isElevated) return <Navigate to="/dashboard" replace />;
  if (execOrAdminOnly && user.role !== "executive" && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
