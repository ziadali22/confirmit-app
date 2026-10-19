"use client";

import { useEffect, useState } from "react";
import { connectOwnNumber, disconnectOwnNumber } from "@/app/actions";
import Icon from "@/components/Icon";

type Status = { status: string; qrDataUrl: string | null; me: string | null };

// The QR / own-number panel inside Settings → WhatsApp connection.
export default function ConnectNumber({ initialMode }: { initialMode: string }) {
  const [s, setS] = useState<Status>({ status: "loading", qrDataUrl: null, me: null });
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

  if (!active || s.status === "disconnected") {
    return (
      <div className="qr-panel" style={{ alignItems: "center" }}>
        <div className="steps">
          <div className="status-line">
            <span className="dot" style={{ background: active ? "var(--bad-fg)" : "var(--faint)" }} /> {active ? "Disconnected" : "Not linked"}
          </div>
          <p className="hint" style={{ fontSize: 13, lineHeight: "20px" }}>
            Link your number like WhatsApp Web. It keeps working on your phone, and customers reply by tapping a numbered menu.
          </p>
        </div>
        <form action={connectOwnNumber} onSubmit={() => setBusy(true)}>
          <button className="btn primary" disabled={busy}><Icon name="qr" size={15} /> {busy ? "Starting…" : active ? "Reconnect" : "Connect my number"}</button>
        </form>
      </div>
    );
  }

  if (s.status === "loading") {
    return <div className="qr-panel"><span className="muted">Checking your number’s connection…</span></div>;
  }

  if (s.status === "connected") {
    return (
      <div className="qr-panel" style={{ alignItems: "center" }}>
        <div className="steps">
          <div className="status-line"><span className="dot" style={{ background: "var(--brand)" }} /> Connected as {s.me || "your number"}</div>
          <p className="hint" style={{ fontSize: 13 }}>Order confirmations now send from your WhatsApp.</p>
        </div>
        <form action={disconnectOwnNumber}><button className="btn danger">Disconnect</button></form>
      </div>
    );
  }

  return (
    <div className="qr-panel">
      <div className="qr-box">
        {s.qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.qrDataUrl} alt="WhatsApp QR code" width={176} height={176} />
        ) : (
          "Starting session… the code appears in a few seconds."
        )}
      </div>
      <div className="steps">
        <div className="status-line"><span className="dot" style={{ background: "#e5a000" }} /> {s.qrDataUrl ? "Waiting for scan" : "Starting session"}</div>
        <div className="step"><span className="n">1</span><span>Open <b>WhatsApp</b> on the phone with your store’s number.</span></div>
        <div className="step"><span className="n">2</span><span>Go to <b>Settings → Linked devices</b>.</span></div>
        <div className="step"><span className="n">3</span><span>Tap <b>Link a device</b> and scan this code.</span></div>
        <form action={disconnectOwnNumber}><button className="btn">Cancel</button></form>
      </div>
    </div>
  );
}
