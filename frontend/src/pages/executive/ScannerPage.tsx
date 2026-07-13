import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../../lib/api";
import type { Meeting } from "../../types";

export default function ScannerPage() {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    api.get("/meetings").then(({ data }) => setMeetings(data));
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function handleScanSuccess(decodedText: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { data } = await api.post(`/meetings/${selectedMeetingId}/attendance/scan`, { qrToken: decodedText });
      setStatusIsError(false);
      setStatusMessage(t("scanner.scanSuccess", { name: data.member?.profile?.fullName ?? data.memberId }));
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
                {m.title} ({new Date(m.meetingDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        {!scanning ? (
          <button
            onClick={startScanning}
            disabled={!selectedMeetingId}
            className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("scanner.startScanning")}
          </button>
        ) : (
          <button onClick={stopScanning} className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">
            {t("scanner.stopScanning")}
          </button>
        )}
      </div>

      {statusMessage && (
        <p className={`mb-3 rounded p-2 text-sm ${statusIsError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {statusMessage}
        </p>
      )}

      <div id="qr-reader" className="mx-auto max-w-md" />
    </div>
  );
}
