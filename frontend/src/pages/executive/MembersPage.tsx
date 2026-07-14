import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../../lib/api";
import type { Member } from "../../types";

export default function MembersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

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

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function handleScanSuccess(decodedText: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { data } = await api.get(`/members/by-qr/${encodeURIComponent(decodedText)}`);
      await stopScanning();
      navigate(`/members/${data.memberId}`);
    } catch (err: any) {
      setScanError(err.response?.data?.error ?? "Scan failed");
      busyRef.current = false;
    }
  }

  async function startScanning() {
    setScanError(null);
    const scanner = new Html5Qrcode("member-qr-reader");
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
      setScanError(t("scanner.cameraPermission"));
    }
  }

  async function stopScanning() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("members.title")}</h1>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("members.searchPlaceholder") ?? ""}
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {!scanning ? (
          <button
            onClick={startScanning}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-slate-800"
          >
            {t("members.scanQr")}
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t("scanner.stopScanning")}
          </button>
        )}
      </div>

      {scanError && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{scanError}</p>}
      {scanning && <div id="member-qr-reader" className="mx-auto mb-4 max-w-sm" />}

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
