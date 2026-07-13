import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { MessageRecipientEntry } from "../types";

export default function InboxPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MessageRecipientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get("/messages/inbox");
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen(entry: MessageRecipientEntry) {
    setExpanded(expanded === entry.id ? null : entry.id);
    if (!entry.readAt) {
      await api.put(`/messages/inbox/${entry.id}/read`);
      setEntries((es) => es.map((e) => (e.id === entry.id ? { ...e, readAt: new Date().toISOString() } : e)));
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("inbox.title")}</h1>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-500">{t("inbox.empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3">
              <button onClick={() => handleOpen(entry)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${!entry.readAt ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                    {entry.message.subject}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(entry.message.sentAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {t("inbox.from")}: {entry.message.sender.profile?.fullName ?? entry.message.sender.email}
                </div>
              </button>
              {expanded === entry.id && (
                <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  {entry.message.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
