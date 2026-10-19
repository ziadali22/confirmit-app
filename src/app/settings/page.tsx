import Shell from "@/components/Shell";
import Icon, { type IconName } from "@/components/Icon";
import ConnectNumber from "@/components/ConnectNumber";
import CopyField from "@/components/CopyField";
import { getBrand } from "@/lib/db";
import { saveSettings } from "@/app/actions";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const METHODS: { mode: string; title: string; icon: IconName; text: string }[] = [
  { mode: "baileys", title: "Your own number", icon: "qr", text: "Link with a QR code, like WhatsApp Web. Keeps working on your phone." },
  { mode: "meta", title: "Meta Cloud API", icon: "shield", text: "Official API. Needs a spare number registered with Meta." },
  { mode: "mock", title: "Mock mode", icon: "flask", text: "Simulates sends so you can test without messaging anyone." },
];

export default async function SettingsPage() {
  const brand = await getBrand();
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const webhookUrl = `${proto}://${host}/api/webhooks/whatsapp`;

  return (
    <Shell>
      <div className="stack" style={{ gap: 28 }}>
        <div className="page-head">
          <div>
            <h1>Settings</h1>
            <p className="sub">How messages are sent, your store details and the Meta connection.</p>
          </div>
          <button className="btn primary" form="settings-form">Save settings</button>
        </div>

        <section className="section">
          <header>
            <h2>WhatsApp connection</h2>
            <p className="sub" style={{ fontSize: 13 }}>How messages go out right now.</p>
          </header>
          <div className="card">
            <div className="methods">
              {METHODS.map((m) => (
                <div key={m.mode} className={`method${brand.waMode === m.mode ? " on" : ""}`}>
                  <div className="mh"><Icon name={m.icon} size={18} /> {m.title}<span className="radio" /></div>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
            <ConnectNumber initialMode={brand.waMode} />
            {brand.waMode === "baileys" && (
              <div className="callout warn">
                <Icon name="alert" />
                <div><b>Unofficial method</b>Automated or bulk sending from a personal number can get it banned by WhatsApp. Use the Meta Cloud API for high volume.</div>
              </div>
            )}
          </div>
        </section>

        <form id="settings-form" action={saveSettings} className="stack" style={{ gap: 28 }}>
        <section className="section">
          <header>
            <h2>Store</h2>
            <p className="sub" style={{ fontSize: 13 }}>Shown in messages as <code>{"{shopName}"}</code>, and used as the sender.</p>
          </header>
          <div className="card">
            <div className="grid-2">
              <div className="field"><label>Store name</label><input type="text" name="name" defaultValue={brand.name} /></div>
              <div className="field">
                <label>Sender WhatsApp number</label>
                <input type="text" name="whatsappNumber" defaultValue={brand.whatsappNumber} placeholder="+2015…" />
                <p className="hint">Include the country code.</p>
              </div>
            </div>
            <label className="switch-row">
              <span>
                <b>Mock mode</b>
                <span className="hint">Simulate sends. Turn off to send real WhatsApp messages through Meta.</span>
              </span>
              <input type="checkbox" name="mock" className="switch" defaultChecked={brand.mock} />
            </label>
          </div>
        </section>

        <section className="section" id="meta">
          <header>
            <h2>Meta WhatsApp Cloud API</h2>
            <p className="sub" style={{ fontSize: 13 }}>For live sending through Meta. Find these in Meta → WhatsApp → API Setup.</p>
          </header>
          <div className="card">
            <div className="grid-2">
              <div className="field"><label>Phone number ID</label><input type="text" name="phoneNumberId" defaultValue={brand.phoneNumberId} placeholder="1234567890" /></div>
              <div className="field"><label>App secret</label><input type="text" name="appSecret" defaultValue={brand.appSecret} placeholder="For the webhook signature" /></div>
            </div>
            <div className="field">
              <label>Access token {brand.accessToken && <span className="counter">Saved. Leave blank to keep it.</span>}</label>
              <input type="password" name="accessToken" placeholder={brand.accessToken ? "••••••••••••" : "EAAG…"} autoComplete="off" />
            </div>
            <div className="callout info">
              <Icon name="info" />
              <div>Your sender number must be registered with Meta. Once registered it leaves the normal WhatsApp app, so use a spare number.</div>
            </div>
          </div>
        </section>

        </form>

        <section className="section">
          <header>
            <h2>Webhook</h2>
            <p className="sub" style={{ fontSize: 13 }}>Paste these into Meta so customer replies reach Confirm It.</p>
          </header>
          <div className="card">
            <CopyField label="Callback URL" value={webhookUrl} />
            <CopyField label="Verify token" value={brand.verifyToken || "Save settings once to generate"} />
            <div className="callout info">
              <Icon name="info" />
              <div>
                A list message only delivers after the customer has messaged you, which opens WhatsApp’s 24-hour window.
                Testing locally? Meta can’t reach localhost, so expose it with <code>cloudflared tunnel --url http://localhost:3000</code> and use that HTTPS URL.
              </div>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
