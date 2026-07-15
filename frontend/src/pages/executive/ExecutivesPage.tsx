import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { ExecutiveHistoryEntry, ExecutivePositionRecord, ExecutivePositionType, Member, PrivilegeDelegation } from "../../types";

const POSITIONS: ExecutivePositionType[] = ["chairman", "vice_chairman", "secretary", "vice_secretary", "treasurer"];

export default function ExecutivesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [positions, setPositions] = useState<ExecutivePositionRecord[]>([]);
  const [history, setHistory] = useState<ExecutiveHistoryEntry[]>([]);
  const [delegations, setDelegations] = useState<PrivilegeDelegation[]>([]);
  const [activeDialog, setActiveDialog] = useState<{ type: "appoint" | "remove"; position: ExecutivePositionType } | null>(
    null
  );
  const [memberQuery, setMemberQuery] = useState("");
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function loadAll() {
    const [positionsRes, historyRes] = await Promise.all([api.get("/executives"), api.get("/executives/history")]);
    setPositions(positionsRes.data);
    setHistory(historyRes.data);
    if (isAdmin) {
      const { data } = await api.get("/admin/delegations");
      setDelegations(data);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRevoke(delegationId: string) {
    if (!window.confirm(t("executives.delegations.revokeConfirm") ?? "")) return;
    setRevokeError(null);
    try {
      await api.post(`/admin/delegations/${delegationId}/revoke`, {});
      await loadAll();
    } catch (err: any) {
      setRevokeError(err.response?.data?.error ?? "Action failed");
    }
  }

  useEffect(() => {
    if (!memberQuery) {
      setMemberOptions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get("/members", { params: { q: memberQuery, pageSize: 10 } });
      setMemberOptions(data.members);
    }, 300);
    return () => clearTimeout(handle);
  }, [memberQuery]);

  function openAppoint(position: ExecutivePositionType) {
    setActiveDialog({ type: "appoint", position });
    setMemberQuery("");
    setSelectedMemberId("");
    setReason("");
    setError(null);
  }

  function openRemove(position: ExecutivePositionType) {
    setActiveDialog({ type: "remove", position });
    setReason("");
    setError(null);
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!activeDialog) return;
    setError(null);
    try {
      if (activeDialog.type === "appoint") {
        await api.post(`/executives/${activeDialog.position}/appoint`, { memberId: selectedMemberId, reason });
      } else {
        await api.post(`/executives/${activeDialog.position}/remove`, { reason });
      }
      setActiveDialog(null);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Action failed");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("executives.title")}</h1>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("executives.currentHolders")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {POSITIONS.map((position) => {
            const record = positions.find((p) => p.position === position);
            return (
              <div key={position} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="text-sm font-medium text-slate-500">{t(`executives.positions.${position}`)}</div>
                <div className="mt-1 font-semibold">
                  {record?.currentHolder?.profile?.fullName ?? record?.currentHolder?.email ?? (
                    <span className="text-slate-400">{t("executives.vacant")}</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openAppoint(position)}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {t("executives.appoint")}
                  </button>
                  {record?.currentHolderId && (
                    <button
                      onClick={() => openRemove(position)}
                      className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                    >
                      {t("executives.remove")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {activeDialog && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-slate-900">
            <h3 className="mb-3 text-lg font-semibold">
              {activeDialog.type === "appoint" ? t("executives.appointTitle") : t("executives.removeTitle")} —{" "}
              {t(`executives.positions.${activeDialog.position}`)}
            </h3>
            {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={handleConfirm} className="space-y-3">
              {activeDialog.type === "appoint" && (
                <div>
                  <label className="block text-sm font-medium">{t("executives.selectMember")}</label>
                  <input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                  {memberOptions.length > 0 && (
                    <ul className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                      {memberOptions.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberId(m.id);
                              setMemberQuery(m.profile?.fullName ?? m.email);
                              setMemberOptions([]);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-slate-800 ${
                              selectedMemberId === m.id ? "bg-emerald-50 dark:bg-slate-800" : ""
                            }`}
                          >
                            {m.profile?.fullName ?? m.email}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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
                  onClick={() => setActiveDialog(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={activeDialog.type === "appoint" && !selectedMemberId}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {t("common.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("executives.delegations.title")}</h2>
          {revokeError && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{revokeError}</p>}
          {delegations.filter((d) => d.isActive).length === 0 ? (
            <p className="text-sm text-slate-500">{t("executives.delegations.noActiveDelegations")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2">{t("executives.delegations.grantedTo")}</th>
                  <th className="py-2">{t("executives.delegations.grantedBy")}</th>
                  <th className="py-2">{t("executives.delegations.grantedAt")}</th>
                  <th className="py-2">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {delegations
                  .filter((d) => d.isActive)
                  .map((d) => (
                    <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800/50">
                      <td className="py-2">{d.member.profile?.fullName ?? d.member.email}</td>
                      <td className="py-2">{d.granter.profile?.fullName ?? d.granter.email}</td>
                      <td className="py-2">{new Date(d.grantedAt).toLocaleString()}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleRevoke(d.id)}
                          className="text-red-700 hover:underline dark:text-red-400"
                        >
                          {t("executives.delegations.revoke")}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("executives.auditHistory")}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("common.date")}</th>
              <th className="py-2">{t("executives.title")}</th>
              <th className="py-2">{t("common.actions")}</th>
              <th className="py-2">{t("auth.fullName")}</th>
              <th className="py-2">{t("common.reason")}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{new Date(h.createdAt).toLocaleString()}</td>
                <td className="py-2">{t(`executives.positions.${h.position}`)}</td>
                <td className="py-2">
                  {h.action === "appointed" ? t("executives.actionAppointed") : t("executives.actionRemoved")}
                </td>
                <td className="py-2">{h.target.profile?.fullName ?? h.target.email}</td>
                <td className="py-2">{h.reason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
