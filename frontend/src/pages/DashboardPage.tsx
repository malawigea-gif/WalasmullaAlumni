import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const icons: Record<string, ReactNode> = {
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  fees: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  donations: (
    <path d="M12 20s-7-4.35-9.5-8.5C.5 8 2 4.5 5.5 4.5c2 0 3.5 1.2 4.5 2.7 1-1.5 2.5-2.7 4.5-2.7 3.5 0 5 3.5 4 7C16 15.65 12 20 12 20z" />
  ),
  labour: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M12 20c0-3.3 2.7-5 6-5" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m8.5 14.5 2 2 4-4" />
    </>
  ),
  qrCode: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
    </>
  ),
  inbox: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  members: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M15 15.5c2.7.3 4.5 1.8 4.5 4.5" />
    </>
  ),
  scanner: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </>
  ),
  sendMessage: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </>
  ),
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  executives: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m8.5 13.5-1.5 7 5-3 5 3-1.5-7" />
    </>
  ),
  admin: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </>
  ),
};

const tileColors = [
  "bg-teal-500",
  "bg-amber-500",
  "bg-pink-600",
  "bg-orange-600",
  "bg-rose-400",
  "bg-lime-600",
  "bg-sky-700",
  "bg-slate-600",
  "bg-purple-600",
  "bg-teal-700",
  "bg-cyan-600",
  "bg-fuchsia-600",
];

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
      <h2 className="mb-3 text-sm font-medium text-slate-500">{t("dashboard.quickLinks")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {links.map((link, index) => (
          <Link
            key={link.to}
            to={link.to}
            className={`group relative flex min-h-[150px] flex-col justify-between overflow-hidden rounded-lg p-4 text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${
              tileColors[index % tileColors.length]
            }`}
          >
            <span className="pointer-events-none absolute -top-3 right-1 select-none text-6xl font-black text-white/20">
              {index + 1}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative h-10 w-10"
            >
              {icons[link.key]}
            </svg>
            <span className="relative text-sm font-semibold leading-tight">{t(`nav.${link.key}`)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
