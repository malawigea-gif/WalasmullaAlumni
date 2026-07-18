import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import type { Member } from "../../types";

type RecipientType = "individual" | "group" | "broadcast";

export default function SendMessagePage() {
  const { t } = useTranslation();
  const [recipientType, setRecipientType] = useState<RecipientType>("broadcast");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [recipientMemberId, setRecipientMemberId] = useState("");
  const [district, setDistrict] = useState("");
  const [gramaNiladhariDivision, setGramaNiladhariDivision] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (recipientType !== "individual" || !memberQuery) {
      setMemberOptions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get("/members", { params: { q: memberQuery, pageSize: 10 } });
      setMemberOptions(data.members);
    }, 300);
    return () => clearTimeout(handle);
  }, [memberQuery, recipientType]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setSending(true);
    try {
      await api.post("/messages", {
        subject,
        body,
        recipientType,
        recipientMemberId: recipientType === "individual" ? recipientMemberId : undefined,
        recipientFilter:
          recipientType === "group"
            ? { district: district || undefined, gramaNiladhariDivision: gramaNiladhariDivision || undefined }
            : undefined,
      });
      setStatus(t("messages.sent"));
      setSubject("");
      setBody("");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("messages.title")}</h1>

      {status && <p className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-800">{status}</p>}
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-3">
        <div>
          <label className="block text-sm font-medium">{t("messages.recipientType")}</label>
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value as RecipientType)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="broadcast">{t("messages.broadcast")}</option>
            <option value="group">{t("messages.group")}</option>
            <option value="individual">{t("messages.individual")}</option>
          </select>
        </div>

        {recipientType === "individual" && (
          <div>
            <label className="block text-sm font-medium">{t("messages.selectRecipient")}</label>
            <input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder={t("members.searchPlaceholder") ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
            {memberOptions.length > 0 && (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                {memberOptions.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientMemberId(m.id);
                        setMemberQuery(m.profile?.fullName ?? m.email);
                        setMemberOptions([]);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800 ${
                        recipientMemberId === m.id ? "bg-blue-50 dark:bg-slate-800" : ""
                      }`}
                    >
                      {m.profile?.fullName ?? m.email} ({m.email})
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {recipientType === "group" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">{t("common.district")}</label>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t("profile.gramaNiladhari")}</label>
              <input
                value={gramaNiladhariDivision}
                onChange={(e) => setGramaNiladhariDivision(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">{t("messages.subject")}</label>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">{t("messages.body")}</label>
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={sending || (recipientType === "individual" && !recipientMemberId)}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {t("messages.send")}
        </button>
      </form>
    </div>
  );
}
