"use client";

import { useMemo, useState } from "react";
import { saveTemplate } from "@/app/actions";
import { LIMITS, PLACEHOLDERS } from "@/lib/constants";
import Icon, { type IconName } from "@/components/Icon";

type Opt = { label: string; orderTag: string; responseMessage: string; action: string };
type Initial = {
  header: string; body: string; sectionTitle: string; buttonText: string;
  options: Opt[]; shopName: string;
};

const ACTIONS: { value: string; label: string; icon: IconName; cls: string }[] = [
  { value: "confirm", label: "Confirm order", icon: "check", cls: "confirm" },
  { value: "cancel", label: "Cancel order", icon: "x", cls: "cancel" },
  { value: "custom", label: "Tag + reply only", icon: "tag", cls: "" },
];

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

function Counter({ v, max }: { v: string; max: number }) {
  const cls = v.length > max ? "over" : v.length === max ? "full" : "";
  return <span className={`counter ${cls}`}>{v.length}/{max}</span>;
}

export default function MessageBuilder({ initial }: { initial: Initial }) {
  const [header, setHeader] = useState(initial.header);
  const [body, setBody] = useState(initial.body);
  const [sectionTitle, setSection] = useState(initial.sectionTitle);
  const [buttonText, setButton] = useState(initial.buttonText);
  const [options, setOptions] = useState<Opt[]>(
    initial.options.length ? initial.options : [{ label: "", orderTag: "", responseMessage: "", action: "confirm" }]
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify([initial.header, initial.body, initial.sectionTitle, initial.buttonText, initial.options]));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const snapshot = JSON.stringify([header, body, sectionTitle, buttonText, options]);
  const dirty = useMemo(() => snapshot !== baseline, [snapshot, baseline]);

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const addOpt = () => setOptions((p) => [...p, { label: "", orderTag: "", responseMessage: "", action: "custom" }]);
  const delOpt = (i: number) => setOptions((p) => p.filter((_, idx) => idx !== i));
  const discard = () => {
    setHeader(initial.header); setBody(initial.body); setSection(initial.sectionTitle); setButton(initial.buttonText);
    setOptions(initial.options.length ? initial.options : [{ label: "", orderTag: "", responseMessage: "", action: "confirm" }]);
  };

  const shown = options.filter((o) => o.label.trim());

  return (
    <form
      className="stack"
      action={async (fd) => {
        setSaving(true);
        await saveTemplate(fd);
        setSaving(false);
        setBaseline(snapshot);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }}
    >
      <div className="page-head">
        <div>
          <h1>Confirmation message</h1>
          <p className="sub">What every customer receives when they order. Placeholders like <code>{"{firstName}"}</code> fill in per order.</p>
        </div>
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          {dirty && <span className="dirty"><i /> Unsaved changes</span>}
          {!dirty && saved && <span className="dirty saved"><i /> Saved</span>}
          {dirty && <button type="button" className="btn" onClick={discard}>Discard</button>}
          <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save message"}</button>
        </div>
      </div>

      <div className="cols">
        <div className="stack">
          <div className="card">
            <div>
              <h2>List message</h2>
              <p className="sub" style={{ fontSize: 13 }}>Sent as a WhatsApp list: a message with a button that opens your options.</p>
            </div>
            <div className="field">
              <label>Header <Counter v={header} max={LIMITS.header} /></label>
              <input type="text" name="header" value={header} maxLength={LIMITS.header} onChange={(e) => setHeader(e.target.value)} />
            </div>
            <div className="field">
              <label>Message body <Counter v={body} max={LIMITS.body} /></label>
              <textarea name="body" value={body} rows={5} onChange={(e) => setBody(e.target.value)} />
              <div className="chips">
                <span className="hint">Insert</span>
                {PLACEHOLDERS.map((p) => (
                  <button type="button" key={p} className="chip" onClick={() => setBody((b) => b + `{${p}}`)}>{`{${p}}`}</button>
                ))}
              </div>
              <p className="hint">WhatsApp formatting works: *bold*, _italic_.</p>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Section title <Counter v={sectionTitle} max={LIMITS.section} /></label>
                <input type="text" name="sectionTitle" value={sectionTitle} maxLength={LIMITS.section} onChange={(e) => setSection(e.target.value)} />
                <p className="hint">Shown above the options in the list.</p>
              </div>
              <div className="field">
                <label>Button text <Counter v={buttonText} max={LIMITS.button} /></label>
                <input type="text" name="buttonText" value={buttonText} maxLength={LIMITS.button} onChange={(e) => setButton(e.target.value)} />
                <p className="hint">The button customers tap to open the list.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div>
              <h2>Options</h2>
              <p className="sub" style={{ fontSize: 13 }}>Each option adds a tag to the order, sends a reply, and decides what happens to the order.</p>
            </div>
            {options.map((o, i) => (
              <div key={i} className="opt-card">
                <div className="oh">
                  Option {i + 1}
                  {options.length > 1 && (
                    <button type="button" className="btn plain danger sm" onClick={() => delOpt(i)}><Icon name="trash" size={14} /> Remove</button>
                  )}
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Label <Counter v={o.label} max={LIMITS.rowTitle} /></label>
                    <input type="text" name="opt_label" value={o.label} maxLength={LIMITS.rowTitle}
                      placeholder="Pay with Instapay" onChange={(e) => setOpt(i, { label: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Order tag</label>
                    <input type="text" name="opt_tag" value={o.orderTag}
                      placeholder="Shipping paid with Instapay" onChange={(e) => setOpt(i, { orderTag: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label>Reply sent to customer</label>
                  <textarea name="opt_reply" value={o.responseMessage} rows={2} style={{ minHeight: 64 }}
                    placeholder="Instapay: https://ipn.eg/…" onChange={(e) => setOpt(i, { responseMessage: e.target.value })} />
                </div>
                <div className="field">
                  <span className="label">When picked</span>
                  <input type="hidden" name="opt_action" value={o.action} />
                  <div className="seg" role="radiogroup" aria-label={`What option ${i + 1} does`}>
                    {ACTIONS.map((a) => (
                      <button type="button" key={a.value} role="radio" aria-checked={o.action === a.value}
                        className={`${a.cls}${o.action === a.value ? " on" : ""}`} onClick={() => setOpt(i, { action: a.value })}>
                        <Icon name={a.icon} size={14} /> {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="row" style={{ alignItems: "center" }}>
              <button type="button" className="btn" onClick={addOpt} disabled={options.length >= LIMITS.maxRows}>
                <Icon name="plus" size={15} /> Add option
              </button>
              <span className="hint">Up to {LIMITS.maxRows} options. Labels up to {LIMITS.rowTitle} characters.</span>
            </div>
          </div>
        </div>

        <div className="stack sticky" style={{ gap: 12 }}>
          <h2>Live preview</h2>
          <div className="phone">
            <div className="screen">
              <div className="wa-head">
                <span className="wa-av">{(initial.shopName || "Y")[0].toUpperCase()}</span>
                <div><b>{initial.shopName || "Your Store"}</b><span>Business account</span></div>
              </div>
              <div className="chat">
                <div className="bubble in wide" dir="auto">
                  {header && <span className="head">{header}</span>}
                  <span dangerouslySetInnerHTML={{ __html: preview(body, initial.shopName) }} />
                  <span className="time">10:42</span>
                  <span className="list-btn"><Icon name="list" size={15} /> {buttonText || "Select"}</span>
                </div>
                {shown.length > 0 && (
                  <div className="sheet" dir="auto">
                    <div className="st">{sectionTitle || "Options"}</div>
                    {shown.map((o, i) => (
                      <div key={i} className="opt">{preview(o.label, initial.shopName).replace(/<[^>]+>/g, "")}<i /></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="hint">Sample data: Ziad · order #1001 · 500 EGP. Arabic messages render right-to-left automatically.</p>
        </div>
      </div>
    </form>
  );
}
