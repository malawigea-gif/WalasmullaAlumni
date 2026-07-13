import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import type { Member } from "../../types";

export default function MembersPage() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(async () => {
      const { data } = await api.get("/members", { params: { q: query || undefined, page } });
      setMembers(data.members);
      setTotalPages(data.pagination.totalPages);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, page]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("members.title")}</h1>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={t("members.searchPlaceholder") ?? ""}
        className="mb-4 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
      />

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">{t("auth.fullName")}</th>
                <th className="py-2">{t("auth.email")}</th>
                <th className="py-2">{t("common.district")}</th>
                <th className="py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="py-2">{m.profile?.fullName ?? "-"}</td>
                  <td className="py-2">{m.email}</td>
                  <td className="py-2">{m.profile?.district ?? "-"}</td>
                  <td className="py-2">
                    <Link to={`/members/${m.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                      {t("members.viewProfile")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              ←
            </button>
            <span className="text-sm">
              {page} / {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
