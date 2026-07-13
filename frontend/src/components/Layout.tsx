import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

const memberLinks = [
  { to: "/dashboard", key: "dashboard" },
  { to: "/profile", key: "profile" },
  { to: "/fees", key: "fees" },
  { to: "/donations", key: "donations" },
  { to: "/labour", key: "labour" },
  { to: "/attendance", key: "attendance" },
  { to: "/qr-code", key: "qrCode" },
  { to: "/inbox", key: "inbox" },
] as const;

const executiveLinks = [
  { to: "/members", key: "members" },
  { to: "/scanner", key: "scanner" },
  { to: "/send-message", key: "sendMessage" },
  { to: "/reports", key: "reports" },
  { to: "/executives", key: "executives" },
] as const;

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "si" ? "en" : "si");
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${
      isActive
        ? "bg-emerald-600 text-white"
        : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{t("app.name")}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              {i18n.language === "si" ? "English" : "සිංහල"}
            </button>
            {user && (
              <button
                onClick={logout}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                {t("nav.logout")}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row">
        <nav className="flex shrink-0 flex-row flex-wrap gap-1 md:w-56 md:flex-col">
          {memberLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {t(`nav.${link.key}`)}
            </NavLink>
          ))}
          {user?.role === "executive" && (
            <>
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" />
              {executiveLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {t(`nav.${link.key}`)}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <main className="min-w-0 flex-1 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
