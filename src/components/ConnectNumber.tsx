"use client";

import { useEffect, useState } from "react";
import { connectOwnNumber, disconnectOwnNumber } from "@/app/actions";

type Status = { status: string; qrDataUrl: string | null; me: string | null };

export default function ConnectNumber({ initialMode }: { initialMode: string }) {
  const [s, setS] = useState<Status>({ status: "disconnected", qrDataUrl: null, me: null });
  const [busy, setBusy] = useState(false);
  const active = initialMode === "baileys";

  useEffect(() => {
    if (!active) return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/wa/status", { cache: "no-store" });
        if (!stop) setS(await r.json());
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 2500);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [active]);

  const badge = () => {
    const map: Record<string, [string, string]> = {
      connected: ["#ecfdf5", "#047857"],
      qr: ["#fff7ed", "#c2410c"],
      connecting: ["#fff7ed", "#c2410c"],
      disconnected: ["#fef2f2", "#b91c1c"],
    };
    const [bg, fg] = map[s.status] || map.disconnected;
    return <span className="pill" style={{ background: bg, color: fg }}>{s.status}</span>;
  };

  return (
    <div className="card">
      <h2>Your own WhatsApp number {active && badge()}</h2>
      <p className="hint" style={{ marginTop: -6 }}>
        Link your number like WhatsApp Web — it keeps working on your phone. Replies come back as a numbered menu.
        <br />⚠️ Unofficial method: bulk/automated sending can get a number banned by WhatsApp.
      </p>

      {!active && (
        <form action={connectOwnNumber} onSubmit={() => setBusy(true)}>
          <button className="btn green" disabled={busy}>{busy ? "Starting…" : "Connect my number"}</button>
        </form>
      )}

      {active && s.status !== "connected" && (
        <div style={{ textAlign: "center" }}>
          {s.qrDataUrl ? (
            <>
              <p className="hint">On your phone: WhatsApp → <b>Settings → Linked devices → Link a device</b>, then scan:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.qrDataUrl} alt="WhatsApp QR" width={240} height={240} style={{ border: "1px solid var(--line)", borderRadius: 8 }} />
            </>
          ) : (
            <p className="muted">Starting session… the QR code will appear here in a few seconds.</p>
          )}
          <div style={{ marginTop: 12 }}>
            <form action={disconnectOwnNumber} style={{ display: "inline" }}>
              <button className="btn ghost sm">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {active && s.status === "connected" && (
        <div>
          <p>Connected as <b>{s.me || "your number"}</b> ✅ — order confirmations now send from your WhatsApp.</p>
          <form action={disconnectOwnNumber}><button className="btn danger sm">Disconnect</button></form>
        </div>
      )}
    </div>
  );
}
