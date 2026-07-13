import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { MeetingAttendance } from "../types";

export default function AttendancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/members/${user.id}/attendance`).then(({ data }) => {
      setAttendance(data);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("attendance.title")}</h1>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : attendance.length === 0 ? (
        <p className="text-slate-500">{t("inbox.empty")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2">{t("attendance.meeting")}</th>
              <th className="py-2">{t("attendance.scannedAt")}</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2">{a.meeting?.title}</td>
                <td className="py-2">{new Date(a.scannedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
