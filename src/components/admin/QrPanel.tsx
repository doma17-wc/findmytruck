"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { generateQrCodeAction } from "@/app/admin/actions";

export default function QrPanel({
  truckId,
  slug,
  shortCode,
  scanCount,
}: {
  truckId: string;
  slug: string;
  shortCode: string | null;
  scanCount: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const redirectUrl = shortCode ? `https://findmytruck.ch/t/${shortCode}` : null;

  useEffect(() => {
    if (!redirectUrl) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(redirectUrl, { width: 240, margin: 1, color: { dark: "#111111" } }).then(
      setDataUrl
    );
  }, [redirectUrl]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateQrCodeAction(truckId, slug);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-100 p-4">
      {dataUrl ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR code" width={180} height={180} className="rounded-lg" />
          <p className="break-all text-center font-mono text-xs text-neutral-500">{redirectUrl}</p>
          <p className="text-sm text-neutral-600">{scanCount} scans</p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No QR code generated yet.</p>
      )}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="mt-4 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {generating ? "Generating…" : shortCode ? "Regenerate QR code" : "Generate QR code"}
      </button>
    </div>
  );
}
