"use client";

import { useState } from "react";
import { createCampaign } from "@/app/actions";
import Icon from "@/components/Icon";

const SAMPLE = "Hi {firstName}! 20% off everything this week at {shopName}.";

export default function CampaignForm({ shopName, reachable }: { shopName: string; reachable: number }) {
  const [body, setBody] = useState("");
  const text = (body || SAMPLE).replace(/\{firstName\}/g, "Ziad").replace(/\{shopName\}/g, shopName || "Your Store");

  return (
    <div className="cols">
      <form action={createCampaign} className="card">
        <h2>New campaign</h2>
        <div className="field">
          <label>Name (internal)</label>
          <input type="text" name="name" placeholder="October sale" required />
          <p className="hint">Only you see this.</p>
        </div>
        <div className="field">
          <label>Message</label>
          <textarea name="body" value={body} rows={4} placeholder={`${SAMPLE} Reply STOP to stop receiving offers.`} required
            onChange={(e) => setBody(e.target.value)} />
          <div className="chips">
            <span className="hint">Insert</span>
            {["firstName", "shopName"].map((p) => (
              <button type="button" key={p} className="chip" onClick={() => setBody((b) => b + `{${p}}`)}>{`{${p}}`}</button>
            ))}
          </div>
        </div>
        <div className="callout" style={{ background: "var(--subtle)", borderColor: "var(--line)", color: "var(--ink-2)", alignItems: "center" }}>
          <Icon name="users" />
          <div style={{ flex: 1 }}>
            <b>Sends to {reachable} {reachable === 1 ? "customer" : "customers"}</b>
            <span className="muted" style={{ fontSize: 12 }}>Everyone who opted in to marketing.</span>
          </div>
          <a href="/customers?f=in" className="btn plain sm">View list</a>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn primary"><Icon name="plus" size={15} /> Create campaign</button>
        </div>
      </form>

      <div className="stack" style={{ gap: 12 }}>
        <h2>Preview</h2>
        <div className="chat panel">
          <div className="bubble in wide" dir="auto">
            {text}
            <span className="time">10:42</span>
          </div>
        </div>
        <p className="hint">Sample name: Ziad.</p>
      </div>
    </div>
  );
}
