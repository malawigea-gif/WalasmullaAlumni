import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/api";
import type { ReportDocument, ReportSummary } from "../../types";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [documents, setDocuments] = useState<ReportDocument[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function loadDocuments() {
    api.get("/report-documents").then(({ data }) => setDocuments(data));
  }

  useEffect(() => {
    api.get("/reports/summary").then(({ data }) => setSummary(data));
    loadDocuments();
  }, []);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!docFile) return;
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("title", docTitle);
      formData.append("reportDate", docDate);
      formData.append("file", docFile);
      await api.post("/report-documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setDocTitle("");
      setDocDate("");
      setDocFile(null);
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? "Upload failed");
    }
  }

  async function handleDeleteDocument(id: string) {
    if (!window.confirm(t("common.delete") ?? "")) return;
    await api.delete(`/report-documents/${id}`);
    loadDocuments();
  }

  if (!summary) return <p>{t("common.loading")}</p>;

  const feeData = summary.feeCollectionByYear.map((f) => ({ label: String(f.year), value: Number(f.total) }));
  const attendanceData = summary.meetingAttendance.map((m) => ({
    label: m.title.length > 14 ? `${m.title.slice(0, 14)}…` : m.title,
    fullLabel: m.title,
    value: m.attendancePercentage,
    attendeeCount: m.attendeeCount,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("reports.title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label={t("reports.totalMembers")} value={summary.totalMembers} />
        <StatTile label={t("reports.donationsTotal")} value={`Rs. ${summary.donations.total}`} />
        <StatTile label={t("reports.labourHours")} value={summary.labourContributions.totalHours} />
        <StatTile label={t("attendance.title")} value={summary.overallAttendanceRecords} />
      </div>

      <ChartSection title={t("reports.feeCollection")}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={feeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--chart-baseline)" }}
              tickLine={false}
            />
            <YAxis tick={{ fill: "var(--chart-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)" }}
              contentStyle={{
                background: "var(--chart-surface)",
                border: "1px solid var(--chart-grid)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--chart-text-primary)",
              }}
              formatter={(value: any) => [`Rs. ${value}`, t("reports.feeCollection")]}
            />
            <Bar dataKey="value" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
        <TableFallback
          headers={[t("common.year"), t("common.amount")]}
          rows={feeData.map((f) => [f.label, `Rs. ${f.value}`])}
        />
      </ChartSection>

      <ChartSection title={t("reports.meetingAttendance")}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={attendanceData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--chart-baseline)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={44}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)" }}
              contentStyle={{
                background: "var(--chart-surface)",
                border: "1px solid var(--chart-grid)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--chart-text-primary)",
              }}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? _label}
              formatter={(value: any, _name: any, item: any) => [
                `${value}% (${item.payload.attendeeCount})`,
                t("reports.meetingAttendance"),
              ]}
            />
            <Bar dataKey="value" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
        <TableFallback
          headers={[t("attendance.meeting"), t("reports.meetingAttendance")]}
          rows={attendanceData.map((a) => [a.fullLabel, `${a.value}% (${a.attendeeCount})`])}
        />
      </ChartSection>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("reports.documents.title")}</h2>
        {uploadError && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{uploadError}</p>}
        <form onSubmit={handleUpload} className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium">{t("reports.documents.uploadTitle")}</label>
            <input
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("reports.documents.uploadDate")}</label>
            <input
              required
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("reports.documents.uploadFile")}</label>
            <input
              required
              type="file"
              accept="application/pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="mt-1 block text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t("reports.documents.upload")}
          </button>
        </form>

        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">{t("reports.documents.noDocuments")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">{t("reports.documents.uploadTitle")}</th>
                <th className="py-2">{t("reports.documents.uploadDate")}</th>
                <th className="py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="py-2">{doc.title}</td>
                  <td className="py-2">{new Date(doc.reportDate).toLocaleDateString()}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline dark:text-blue-400"
                      >
                        {t("reports.documents.download")}
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-700 hover:underline dark:text-red-400"
                      >
                        {t("reports.documents.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TableFallback({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-slate-500">Table view</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {headers.map((h) => (
              <th key={h} className="py-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
              {row.map((cell, j) => (
                <td key={j} className="py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
