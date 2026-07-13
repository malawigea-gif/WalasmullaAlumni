import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/api";
import type { ReportSummary } from "../../types";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    api.get("/reports/summary").then(({ data }) => setSummary(data));
  }, []);

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
