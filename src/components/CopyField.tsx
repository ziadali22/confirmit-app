"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

export default function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="affix">
        <input type="text" readOnly value={value} style={{ paddingRight: 86 }} />
        <button type="button" className="btn sm inline-btn" onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}>
          <Icon name={copied ? "check" : "copy"} size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
