import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import type { AuditLogEntry, Member, PrivilegeDelegation } from "../../types";

type ActionType = "block" | "unblock" | "delete" | "delegate" | "revoke" | "reset-password";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [delegations, setDelegations] = useState<PrivilegeDelegation[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const [activeAction, setActiveAction] = useState<
    { type: ActionType; memberId?: string; delegationId?: string; label: string } | null
  >(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ memberLabel: string; password: string } | null>(null);

  async function loadMembers() {
    const { data } = await api.get("/admin/members", { params: { q: query || undefined, page } });
    setMembers(data.members);
    setTotalPages(data.pagination.totalPages);
    setLoading(false);
  }

  async function loadDelegations() {
    const { data } = await api.get("/admin/delegations");
    setDelegations(data);
  }

  async function loadAuditLog() {
    const { data } = await api.get("/admin/audit-log");
    setAuditLog(data);
  }

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(loadMembers, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page]);

  useEffect(() => {
    loadDelegations();
    loadAuditLog();
  }, []);

  function activeDelegationFor(memberId: string) {
    return delegations.find((d) => d.memberId === memberId && d.isActive);
  }

  function openAction(type: ActionType, label: string, memberId?: string, delegationId?: string) {
    setActiveAction({ type, label, memberId, delegationId });
    setReason("");
    setError(null);
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!activeAction) return;
    setError(null);
    try {
      const { type, memberId, delegationId, label } = activeAction;
      if (type === "block") await api.post(`/admin/members/${memberId}/block`, { reason });
      else if (type === "unblock") await api.post(`/admin/members/${memberId}/unblock`, { reason });
      else if (type === "delete") await api.delete(`/admin/members/${memberId}`, { data: { reason } });
      else if (type === "delegate") await api.post(`/admin/members/${memberId}/delegate`, { reason });
      else if (type === "revoke") await api.post(`/admin/delegations/${delegationId}/revoke`, { reason });
      else if (type === "reset-password") {
        const { data } = await api.post(`/admin/members/${memberId}/reset-password`, { reason });
        const target = members.find((m) => m.id === memberId);
        setResetPasswordResult({ memberLabel: target?.profile?.fullName ?? target?.email ?? label, password: data.temporaryPassword });
      }

      setActiveAction(null);
      await Promise.all([loadMembers(), loadDelegations(), loadAuditLog()]);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Action failed");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("admin.title")}</h1>

      {resetPasswordResult && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {t("admin.newPasswordFor", { name: resetPasswordResult.memberLabel })}
              </p>
              <p className="mt-1 font-mono text-lg text-amber-950 dark:text-amber-100">{resetPasswordResult.password}</p>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{t("admin.newPasswordNote")}</p>
            </div>
            <button
              onClick={() => setResetPasswordResult(null)}
              className="rounded-md border border-amber-400 px-2 py-1 text-xs dark:border-amber-600"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("admin.members")}</h2>
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
                  <th className="py-2">{t("admin.role")}</th>
                  <th className="py-2">{t("admin.status")}</th>
                  <th className="py-2">{t("admin.delegation")}</th>
                  <th className="py-2">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const delegation = activeDelegationFor(m.id);
                  const isDeleted = !!m.deletedAt;
                  return (
                    <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/50">
                      <td className="py-2">{m.profile?.fullName ?? "-"}</td>
                      <td className="py-2">{m.email}</td>
                      <td className="py-2">{t(`admin.roles.${m.role}`)}</td>
                      <td className="py-2">
                        {isDeleted ? (
                          <span className="text-slate-400">{t("admin.deleted")}</span>
                        ) : m.status === "blocked" ? (
                          <span className="text-red-600 dark:text-red-400">{t("admin.blocked")}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{t("admin.active")}</span>
                        )}
                      </td>
                      <td className="py-2">
                        {delegation ? <span className="text-amber-600 dark:text-amber-400">{t("admin.delegated")}</span> : "-"}
                      </td>
                      <td className="py-2">
                        {isDeleted ? (
                          <button
                            onClick={() => openAction("delete", t("admin.restore"), m.id)}
                            className="mr-2 text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {t("admin.restore")}
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {m.status === "blocked" ? (
                              <button
                                onClick={() => openAction("unblock", t("admin.unblock"), m.id)}
                                className="text-emerald-700 hover:underline dark:text-emerald-400"
                              >
                                {t("admin.unblock")}
                              </button>
                            ) : (
                              <button
                                onClick={() => openAction("block", t("admin.block"), m.id)}
                                className="text-amber-700 hover:underline dark:text-amber-400"
                              >
                                {t("admin.block")}
                              </button>
                            )}
                            {m.role === "member" &&
                              (delegation ? (
                                <button
                                  onClick={() => openAction("revoke", t("admin.revokeDelegation"), undefined, delegation.id)}
                                  className="text-amber-700 hover:underline dark:text-amber-400"
                                >
                                  {t("admin.revokeDelegation")}
                                </button>
                              ) : (
                                <button
                                  onClick={() => openAction("delegate", t("admin.delegate"), m.id)}
                                  className="text-emerald-700 hover:underline dark:text-emerald-400"
                                >
                                  {t("admin.delegate")}
                                </button>
                              ))}
                            <button
                              onClick={() => openAction("reset-password", t("admin.resetPassword"), m.id)}
                              className="text-slate-700 hover:underline dark:text-slate-300"
                            >
                              {t("admin.resetPassword")}
                            </button>
                            <button
                              onClick={() => openAction("delete", t("common.delete"), m.id)}
                              className="text-red-700 hover:underline dark:text-red-400"
                            >
                              {t("common.delete")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
      </section>

      {activeAction && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-slate-900">
            <h3 className="mb-3 text-lg font-semibold">{activeAction.label}</h3>
            {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={handleConfirm} className="space-y-3">
              <div>
                <label className="block text-sm font-medium">{t("common.reason")}</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {t("common.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("admin.auditLog")}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.date")}</th>
              <th className="py-2">{t("admin.action")}</th>
              <th className="py-2">{t("admin.actor")}</th>
              <th className="py-2">{t("admin.target")}</th>
              <th className="py-2">{t("common.reason")}</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="py-2">{t(`admin.actions.${entry.action}`)}</td>
                <td className="py-2">{entry.actor.profile?.fullName ?? entry.actor.email}</td>
                <td className="py-2">{entry.target.profile?.fullName ?? entry.target.email}</td>
                <td className="py-2">{entry.reason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
