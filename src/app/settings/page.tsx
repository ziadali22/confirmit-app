import Shell from "@/components/Shell";
import { getBrand } from "@/lib/db";
import { saveSettings } from "@/app/actions";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const brand = await getBrand();
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const webhookUrl = `${proto}://${host}/api/webhooks/whatsapp`;

  return (
    <Shell>
      <h1>WhatsApp connection</h1>
      <p className="sub">Connect your WhatsApp number so Confirm It can send on your behalf. Leave “mock mode” on to test without a real account.</p>

      <form action={saveSettings}>
        <div className="card">
          <h2>Your store</h2>
          <div className="row">
            <div style={{ flex: 1 }}><label>Store name</label><input type="text" name="name" defaultValue={brand.name} /></div>
            <div style={{ flex: 1 }}><label>Your WhatsApp number (sender)</label><input type="text" name="whatsappNumber" defaultValue={brand.whatsappNumber} placeholder="+2015..." /></div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
            <input type="checkbox" name="mock" defaultChecked={brand.mock} style={{ width: "auto" }} />
            Mock mode (simulate sends — turn OFF to send real WhatsApp messages)
          </label>
        </div>

        <div className="card">
          <h2>Meta WhatsApp Cloud API (for live sending)</h2>
          <p className="hint" style={{ marginTop: -6 }}>Get these from Meta → WhatsApp → API Setup. Your sender number must be registered there (it then leaves the normal WhatsApp app — use a spare number).</p>
          <div className="row">
            <div style={{ flex: 1 }}><label>Phone number ID</label><input type="text" name="phoneNumberId" defaultValue={brand.phoneNumberId} placeholder="1234567890" /></div>
            <div style={{ flex: 1 }}><label>App secret</label><input type="text" name="appSecret" defaultValue={brand.appSecret} placeholder="for webhook signature" /></div>
          </div>
          <label>Access token {brand.accessToken && <span className="hint">(saved — leave blank to keep)</span>}</label>
          <input type="password" name="accessToken" placeholder={brand.accessToken ? "••••••••••••" : "EAAG..."} />
        </div>

        <button className="btn green">Save settings</button>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Webhook (paste into Meta)</h2>
        <label>Callback URL</label>
        <input type="text" readOnly value={webhookUrl} />
        <label>Verify token</label>
        <input type="text" readOnly value={brand.verifyToken || "(save settings once to generate)"} />
        <p className="hint">Localhost can’t receive Meta’s callbacks — expose it with <code>cloudflared tunnel --url http://localhost:3000</code> or ngrok, then use that HTTPS URL. For the list message to deliver, the customer must message you first (opens the 24-hour window).</p>
      </div>
    </Shell>
  );
}
