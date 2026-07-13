import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, isElevated } = useAuth();

  const links = [
    { to: "/profile", key: "profile" },
    { to: "/fees", key: "fees" },
    { to: "/donations", key: "donations" },
    { to: "/labour", key: "labour" },
    { to: "/attendance", key: "attendance" },
    { to: "/qr-code", key: "qrCode" },
    { to: "/inbox", key: "inbox" },
    ...(isElevated
      ? [
          { to: "/members", key: "members" },
          { to: "/scanner", key: "scanner" },
          { to: "/send-message", key: "sendMessage" },
          { to: "/reports", key: "reports" },
          { to: "/executives", key: "executives" },
        ]
      : []),
    ...(user?.role === "admin" ? [{ to: "/admin", key: "admin" }] : []),
  ] as const;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        {t("dashboard.welcome", { name: user?.profile?.fullName ?? user?.email })}
      </h1>
      <h2 className="mb-2 text-sm font-medium text-slate-500">{t("dashboard.quickLinks")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-lg border border-slate-200 p-4 text-center font-medium hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            {t(`nav.${link.key}`)}
          </Link>
        ))}
      </div>
    </div>
  );
}
