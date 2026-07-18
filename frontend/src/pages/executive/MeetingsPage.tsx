import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import type { Meeting, MeetingType } from "../../types";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingsPage() {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<MeetingType>("monthly");
  const [hasLabourSession, setHasLabourSession] = useState(false);
  const [labourHours, setLabourHours] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editType, setEditType] = useState<MeetingType>("monthly");
  const [editHasLabourSession, setEditHasLabourSession] = useState(false);
  const [editLabourHours, setEditLabourHours] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get("/meetings");
    setMeetings(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/meetings", {
        title,
        meetingDate: new Date(meetingDate).toISOString(),
        location: location || null,
        type,
        hasLabourSession,
        labourHours: hasLabourSession ? Number(labourHours) : undefined,
      });
      setTitle("");
      setMeetingDate("");
      setLocation("");
      setType("monthly");
      setHasLabourSession(false);
      setLabourHours("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Action failed");
    }
  }

  function startEdit(m: Meeting) {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDate(toDatetimeLocal(m.meetingDate));
    setEditLocation(m.location ?? "");
    setEditType(m.type);
    setEditHasLabourSession(m.hasLabourSession);
    setEditLabourHours(m.labourHours ?? "");
    setEditError(null);
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    try {
      await api.patch(`/meetings/${editingId}`, {
        title: editTitle,
        meetingDate: new Date(editDate).toISOString(),
        location: editLocation || null,
        type: editType,
        hasLabourSession: editHasLabourSession,
        labourHours: editHasLabourSession ? Number(editLabourHours) : null,
      });
      setEditingId(null);
      await load();
    } catch (err: any) {
      setEditError(err.response?.data?.error ?? "Action failed");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("meetings.deleteConfirm") ?? "")) return;
    try {
      await api.delete(`/meetings/${id}`);
      await load();
    } catch (err: any) {
      window.alert(err.response?.data?.error ?? t("meetings.deleteBlocked"));
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("meetings.title")}</h1>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("meetings.create")}</h2>
        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium">{t("meetings.meetingTitle")}</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("meetings.meetingDate")}</label>
            <input
              required
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("meetings.location")}</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("meetings.type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MeetingType)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="monthly">{t("meetings.types.monthly")}</option>
              <option value="committee">{t("meetings.types.committee")}</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={hasLabourSession}
                onChange={(e) => setHasLabourSession(e.target.checked)}
              />
              {t("meetings.hasLabourSession")}
            </label>
            {hasLabourSession && (
              <div>
                <label className="block text-sm font-medium">{t("meetings.labourHours")}</label>
                <input
                  required
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={labourHours}
                  onChange={(e) => setLabourHours(e.target.value)}
                  className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t("meetings.create")}
          </button>
        </form>
      </section>

      <section>
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-500">{t("meetings.noMeetings")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">{t("meetings.meetingTitle")}</th>
                <th className="py-2">{t("meetings.meetingDate")}</th>
                <th className="py-2">{t("meetings.type")}</th>
                <th className="py-2">{t("meetings.location")}</th>
                <th className="py-2">{t("meetings.attendeeCount")}</th>
                <th className="py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) =>
                editingId === m.id ? (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td colSpan={6} className="py-3">
                      {editError && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{editError}</p>}
                      <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-3">
                        <input
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <input
                          required
                          type="datetime-local"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <input
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as MeetingType)}
                          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="monthly">{t("meetings.types.monthly")}</option>
                          <option value="committee">{t("meetings.types.committee")}</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={editHasLabourSession}
                            onChange={(e) => setEditHasLabourSession(e.target.checked)}
                          />
                          {t("meetings.hasLabourSession")}
                        </label>
                        {editHasLabourSession && (
                          <input
                            required
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={editLabourHours}
                            onChange={(e) => setEditLabourHours(e.target.value)}
                            placeholder={t("meetings.labourHours") ?? ""}
                            className="w-24 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                          />
                        )}
                        <button
                          type="submit"
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          {t("common.save")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
                        >
                          {t("common.cancel")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2">
                      {m.title}
                      {m.hasLabourSession && (
                        <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {t("meetings.hasLabourSession")} ({m.labourHours}h)
                        </span>
                      )}
                    </td>
                    <td className="py-2">{new Date(m.meetingDate).toLocaleString()}</td>
                    <td className="py-2">{t(`meetings.types.${m.type}`)}</td>
                    <td className="py-2">{m.location ?? "-"}</td>
                    <td className="py-2">{m._count?.attendances ?? 0}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(m)} className="text-blue-700 hover:underline dark:text-blue-400">
                          {t("meetings.edit")}
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-red-700 hover:underline dark:text-red-400">
                          {t("meetings.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
