import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export default function QrCodePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get(`/members/${user.id}/qr-code`).then(({ data }) => setQrImage(data.qrImage));
  }, [user?.id]);

  function handleDownload() {
    if (!qrImage) return;
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "my-qr-code.png";
    link.click();
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="mb-2 text-2xl font-bold">{t("qr.title")}</h1>
      <p className="mb-4 max-w-md text-slate-500">{t("qr.instructions")}</p>
      {qrImage ? (
        <>
          <img src={qrImage} alt="QR code" className="h-64 w-64 rounded-lg border border-slate-200 dark:border-slate-800" />
          <button
            onClick={handleDownload}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t("qr.download")}
          </button>
        </>
      ) : (
        <p>{t("common.loading")}</p>
      )}
    </div>
  );
}
