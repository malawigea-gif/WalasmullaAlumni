import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { Meeting, MeetingType } from "../../types";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScannerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManageMeetings = user?.role === "executive" || user?.role === "admin";
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editType, setEditType] = useState<MeetingType>("monthly");
  const [editHasLabourSession, setEditHasLabourSession] = useState(false);
  const [editLabourHours, setEditLabourHours] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function loadMeetings() {
    api.get("/meetings").then(({ data }) => setMeetings(data));
  }

  useEffect(() => {
    loadMeetings();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  function startEdit(m: Meeting) {
    setEditingId(m.id);
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
        meetingDate: new Date(editDate).toISOString(),
        location: editLocation || null,
        type: editType,
        hasLabourSession: editHasLabourSession,
        labourHours: editHasLabourSession ? Number(editLabourHours) : null,
      });
      setEditingId(null);
      loadMeetings();
    } catch (err: any) {
      setEditError(err.response?.data?.error ?? "Action failed");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("scanner.deleteConfirm") ?? "")) return;
    try {
      await api.delete(`/meetings/${id}`);
      if (selectedMeetingId === id) setSelectedMeetingId("");
      loadMeetings();
    } catch (err: any) {
      window.alert(err.response?.data?.error ?? t("scanner.deleteBlocked"));
    }
  }

  async function handleScanSuccess(decodedText: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { data } = await api.post(`/meetings/${selectedMeetingId}/attendance/scan`, { qrToken: decodedText });
      setStatusIsError(false);
      const meeting = meetings.find((m) => m.id === selectedMeetingId);
      const name = data.member?.profile?.fullName ?? data.memberId;
      setStatusMessage(
        meeting?.hasLabourSession
          ? t("scanner.scanSuccessWithLabour", { name, hours: meeting.labourHours })
          : t("scanner.scanSuccess", { name })
      );
    } catch (err: any) {
      setStatusIsError(true);
      setStatusMessage(err.response?.data?.error ?? "Scan failed");
    } finally {
      setTimeout(() => {
        busyRef.current = false;
      }, 1500);
    }
  }

  async function startScanning() {
    if (!selectedMeetingId) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        undefined
      );
      setScanning(true);
    } catch {
      setStatusIsError(true);
      setStatusMessage(t("scanner.cameraPermission"));
    }
  }

  async function stopScanning() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("scanner.title")}</h1>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm font-medium">{t("scanner.selectMeeting")}</label>
          <select
            value={selectedMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            disabled={scanning}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">--</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({new Date(m.meetingDate).toLocaleDateString()}) — {t(`meetings.types.${m.type}`)}
                {m.hasLabourSession ? ` — ${t("meetings.hasLabourSession")} (${m.labourHours}h)` : ""}
              </option>
            ))}
          </select>
        </div>
        {canManageMeetings && selectedMeetingId && !scanning && (
          <div className="flex gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                const m = meetings.find((mm) => mm.id === selectedMeetingId);
                if (m) startEdit(m);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
            >
              {t("scanner.editMeeting")}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(selectedMeetingId)}
              className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:text-red-400"
            >
              {t("scanner.deleteMeeting")}
            </button>
          </div>
        )}
        {!scanning ? (
          <button
            onClick={startScanning}
            disabled={!selectedMeetingId}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t("scanner.startScanning")}
          </button>
        ) : (
          <button onClick={stopScanning} className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">
            {t("scanner.stopScanning")}
          </button>
        )}
      </div>

      {editingId && (
        <div className="mb-4 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          {editError && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{editError}</p>}
          <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-3">
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
              placeholder={t("meetings.location") ?? ""}
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
            <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              {t("common.save")}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">
              {t("common.cancel")}
            </button>
          </form>
        </div>
      )}

      {statusMessage && (
        <p className={`mb-3 rounded p-2 text-sm ${statusIsError ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"}`}>
          {statusMessage}
        </p>
      )}

      <div id="qr-reader" className="mx-auto max-w-md" />
    </div>
  );
}
