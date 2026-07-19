import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import associationCrest from "../assets/association-crest.jpg";

const memberLinks = [
  { to: "/dashboard", key: "dashboard" },
  { to: "/profile", key: "profile" },
  { to: "/fees", key: "fees" },
  { to: "/donations", key: "donations" },
  { to: "/labour", key: "labour" },
  { to: "/fines", key: "fines" },
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
  const { user, logout, isElevated } = useAuth();
  const isExecOrAdmin = user?.role === "executive" || user?.role === "admin";

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "si" ? "en" : "si");
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-blue-600 shadow-sm dark:bg-blue-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-4">
            <img
              src={associationCrest}
              alt=""
              className="h-14 w-14 rounded-full border-2 border-white bg-white object-contain"
            />
            <span className="text-lg font-bold leading-tight text-white sm:text-xl">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="rounded-md border border-white/60 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              {i18n.language === "si" ? "English" : "සිංහල"}
            </button>
            {user && (
              <button
                onClick={logout}
                className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25"
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
          {isElevated && (
            <>
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" />
              {executiveLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {t(`nav.${link.key}`)}
                </NavLink>
              ))}
            </>
          )}
          {isExecOrAdmin && (
            <>
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" />
              <NavLink to="/accounts/manage" className={navLinkClass}>
                {t("nav.accountsManage")}
              </NavLink>
              <NavLink to="/meetings" className={navLinkClass}>
                {t("nav.meetings")}
              </NavLink>
            </>
          )}
          {user?.role === "admin" && (
            <>
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" />
              <NavLink to="/admin" className={navLinkClass}>
                {t("nav.admin")}
              </NavLink>
            </>
          )}
        </nav>

        <main className="min-w-0 flex-1 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          {user?.role === "member" && user.activeDelegation && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {t("delegation.activeBanner")}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
