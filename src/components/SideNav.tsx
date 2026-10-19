"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";
import Icon, { type IconName } from "@/components/Icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Orders", icon: "inbox" },
  { href: "/message", label: "Message", icon: "chat" },
  { href: "/campaigns", label: "Campaigns", icon: "megaphone" },
  { href: "/customers", label: "Customers", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

type Props = { storeName: string; sender: string; waMode: string; awaiting: number };

export default function SideNav({ storeName, sender, waMode, awaiting }: Props) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/orders") : path.startsWith(href));

  return (
    <aside className="side">
      <div className="brand"><span className="logo"><Icon name="check" size={18} /></span> Confirm It</div>
      <div className="store">
        <b>{storeName}</b>
        <span>{sender ? `Sender ${sender}` : "No sender number set"}</span>
      </div>
      <nav>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-item${isActive(n.href) ? " active" : ""}`}>
            <Icon name={n.icon} size={17} />
            {n.label}
            {n.href === "/" && awaiting > 0 && <span className="count">{awaiting}</span>}
          </Link>
        ))}
      </nav>
      <div className="spacer" />
      <WaStatus waMode={waMode} />
      <form action={logoutAction}>
        <button className="nav-item logout"><Icon name="logout" size={17} /> Log out</button>
      </form>
    </aside>
  );
}

// Each page renders its own Shell, so the sidebar remounts on every navigation.
// Remember the last socket state so it doesn't flash "Checking…" between pages.
let lastLive: string | null = null;

// How messages go out right now. For the QR (Baileys) mode the socket state is
// live, so poll it; the other modes are a saved setting.
function WaStatus({ waMode }: { waMode: string }) {
  const [live, setLive] = useState<string | null>(() => lastLive);

  useEffect(() => {
    if (waMode !== "baileys") return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/wa/status", { cache: "no-store" });
        const s = await r.json();
        lastLive = s.status;
        if (!stop) setLive(s.status);
      } catch {
        /* keep last known state */
      }
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [waMode]);

  let tone = "warn", title = "Mock mode", text = "Sends are simulated. No customer gets a message.";
  if (waMode === "meta") {
    tone = "ok"; title = "Meta Cloud API"; text = "Messages send through Meta.";
  } else if (waMode === "baileys") {
    if (live === null) { tone = "neutral"; title = "Checking WhatsApp…"; text = "Looking up your number’s connection."; }
    else if (live === "connected") { tone = "ok"; title = "WhatsApp connected"; text = "Messages send from your number."; }
    else if (live === "qr" || live === "connecting") { tone = "warn"; title = "Linking WhatsApp…"; text = "Scan the QR code in Settings to finish."; }
    else { tone = "bad"; title = "WhatsApp disconnected"; text = "Messages won’t send until you reconnect."; }
  }

  return (
    <div className={`wa-status ${tone}`}>
      <b><span className="dot" />{title}</b>
      <span>{text}</span>
      {(tone === "warn" || tone === "bad") && <Link href="/settings">{waMode === "mock" ? "Go live →" : "Connect now →"}</Link>}
    </div>
  );
}
