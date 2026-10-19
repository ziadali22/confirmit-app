"use client";

import { useState } from "react";
import { saveTemplate } from "@/app/actions";
import { LIMITS, PLACEHOLDERS } from "@/lib/constants";

type Opt = { label: string; orderTag: string; responseMessage: string; action: string };
type Initial = {
  header: string; body: string; sectionTitle: string; buttonText: string;
  options: Opt[]; shopName: string;
};

function preview(text: string, shop: string) {
  const ctx: Record<string, string> = {
    firstName: "Ziad", fullName: "Ziad Ali", shopName: shop || "Your Store",
    orderNumber: "1001", total: "500", currency: "EGP",
  };
  const filled = text.replace(/\{(\w+)\}/g, (m, k) => (k in ctx ? ctx[k] : m));
  return filled
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*(.+?)\*/g, "<b>$1</b>").replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/\n/g, "<br/>");
}

export default function MessageBuilder({ initial }: { initial: Initial }) {
  const [header, setHeader] = useState(initial.header);
  const [body, setBody] = useState(initial.body);
  const [sectionTitle, setSection] = useState(initial.sectionTitle);
  const [buttonText, setButton] = useState(initial.buttonText);
  const [options, setOptions] = useState<Opt[]>(
    initial.options.length ? initial.options : [{ label: "", orderTag: "", responseMessage: "", action: "confirm" }]
  );
  const [saved, setSaved] = useState(false);

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const addOpt = () => setOptions((p) => [...p, { label: "", orderTag: "", responseMessage: "", action: "custom" }]);
  const delOpt = (i: number) => setOptions((p) => p.filter((_, idx) => idx !== i));

  const counter = (v: string, max: number) => (
    <span className="counter" style={{ color: v.length > max ? "#b91c1c" : undefined }}>{v.length}/{max}</span>
  );

  return (
    <form action={async (fd) => { await saveTemplate(fd); setSaved(true); setTimeout(() => setSaved(false), 2500); }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        {/* editor */}
        <div style={{ flex: 1, minWidth: 340 }}>
          <div className="card">
            <h2>List message</h2>
            <label>Header {counter(header, LIMITS.header)}</label>
            <input type="text" name="header" value={header} maxLength={LIMITS.header} onChange={(e) => setHeader(e.target.value)} />

            <label>Message body {counter(body, LIMITS.body)}</label>
            <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="chips">
              {PLACEHOLDERS.map((p) => (
                <span key={p} className="chip" style={{ cursor: "pointer" }}
                  onClick={() => setBody((b) => b + `{${p}}`)}>{`{${p}}`}</span>
              ))}
            </div>
            <div className="hint">Tap a chip to insert. WhatsApp formatting works: *bold*, _italic_.</div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Section title {counter(sectionTitle, LIMITS.section)}</label>
                <input type="text" name="sectionTitle" value={sectionTitle} maxLength={LIMITS.section} onChange={(e) => setSection(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Button text {counter(buttonText, LIMITS.button)}</label>
                <input type="text" name="buttonText" value={buttonText} maxLength={LIMITS.button} onChange={(e) => setButton(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Options {options.length > LIMITS.maxRows && <span style={{ color: "#b91c1c", fontSize: 13 }}>(max {LIMITS.maxRows})</span>}</h2>
            <p className="hint" style={{ marginTop: -6 }}>Each option: a label, a tag added to the order, the reply sent back, and what it does.</p>
            {options.map((o, i) => (
              <div key={i} className="card" style={{ background: "#fafbfc" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Option {i + 1}</b>
                  {options.length > 1 && <button type="button" className="btn danger sm" onClick={() => delOpt(i)}>Remove</button>}
                </div>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <label>Label {counter(o.label, LIMITS.rowTitle)}</label>
                    <input type="text" name="opt_label" value={o.label} maxLength={LIMITS.rowTitle}
                      placeholder="✅ Pay with Instapay" onChange={(e) => setOpt(i, { label: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Order tag</label>
                    <input type="text" name="opt_tag" value={o.orderTag}
                      placeholder="Shipping Payed with instapay" onChange={(e) => setOpt(i, { orderTag: e.target.value })} />
                  </div>
                </div>
                <label>Response message (sent to customer)</label>
                <textarea name="opt_reply" value={o.responseMessage} style={{ minHeight: 60 }}
                  placeholder="🔹 Instapay: https://ipn.eg/..." onChange={(e) => setOpt(i, { responseMessage: e.target.value })} />
                <label>When picked</label>
                <select name="opt_action" value={o.action} onChange={(e) => setOpt(i, { action: e.target.value })}>
                  <option value="confirm">Confirm the order</option>
                  <option value="cancel">Cancel the order</option>
                  <option value="custom">Just tag + reply</option>
                </select>
              </div>
            ))}
            <button type="button" className="btn ghost" onClick={addOpt} disabled={options.length >= LIMITS.maxRows}>+ Add option</button>
          </div>

          <button className="btn green">Save message</button>
          {saved && <span style={{ marginLeft: 12, color: "#047857", fontWeight: 600 }}>Saved ✓</span>}
        </div>

        {/* live preview */}
        <div>
          <div className="phone">
            <div className="bar"><div className="av">✓</div><div><b>{initial.shopName || "Your Store"}</b><br /><span style={{ fontSize: 11, opacity: .8 }}>preview</span></div></div>
            <div className="scr">
              <div className="bubble out" dir="auto">
                {header && <div style={{ fontWeight: 700, marginBottom: 6 }}>{header}</div>}
                <span dangerouslySetInnerHTML={{ __html: preview(body, initial.shopName) }} />
                <div style={{ marginTop: 8, borderTop: "1px solid #eee", paddingTop: 6 }}>
                  {options.filter((o) => o.label.trim()).map((o, i) => (
                    <div key={i} className="optbtn" dir="auto">{preview(o.label, initial.shopName).replace(/<[^>]+>/g, "")}</div>
                  ))}
                  <div style={{ textAlign: "center", fontSize: 12, color: "#075e54", fontWeight: 700, marginTop: 4 }}>☰ {buttonText || "Select"}</div>
                </div>
              </div>
            </div>
            <div className="foot" />
          </div>
          <p className="hint" style={{ width: 320 }}>Live preview with sample data. Arabic renders right-to-left automatically.</p>
        </div>
      </div>
    </form>
  );
}
