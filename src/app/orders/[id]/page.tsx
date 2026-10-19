import Link from "next/link";
import Shell from "@/components/Shell";
import Icon from "@/components/Icon";
import { prisma } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/constants";
import { waToHtml, renderMessage, numberedMenu } from "@/lib/messaging";
import { modeOf } from "@/lib/whatsapp";
import { money, STATUS_TONE } from "@/lib/format";
import { sendConfirmationAction, tapOptionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const OUTCOME: Record<string, [string, string]> = {
  pending: ["No reply yet", "warn"],
  confirm: ["Confirmed", "ok"],
  cancel: ["Cancelled", "bad"],
  no_reply: ["No reply", "neutral"],
};
const ACTION: Record<string, [string, string]> = {
  confirm: ["Confirms", "ok"],
  cancel: ["Cancels", "bad"],
  custom: ["Tag + reply", "neutral"],
};

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      logs: { orderBy: { id: "asc" } },
      confirmations: { orderBy: { id: "desc" } },
      // The order's OWN brand — getBrand() is a findFirst with no ordering, so
      // it returns an arbitrary brand and would show another brand's template.
      brand: { include: { template: { include: { options: true } } } },
    },
  });
  if (!order) {
    return (
      <Shell>
        <Link href="/" className="back"><Icon name="back" size={14} /> All orders</Link>
        <div className="card empty"><b>Order not found</b><span className="muted">It may have been removed with the test data.</span></div>
      </Shell>
    );
  }
  const brand = order.brand;
  const tags = JSON.parse(order.tags || "[]") as string[];
  const buttonText = brand.template?.buttonText || "Select";
  const actionFor = (label: string) => brand.template?.options.find((o) => o.label === label)?.action ?? "custom";
  const lastOut = [...order.logs].reverse().find((l) => l.direction === "out" && l.options !== "[]");
  const lastOpts = lastOut ? (JSON.parse(lastOut.options) as { rowId: string; label: string }[]) : [];
  const sends = order.confirmations.length;
  const waiting = order.status === "confirming";

  // Nothing sent yet? Show what this customer WILL receive, rendered with
  // their own name / order number / total rather than sample data. The shape
  // follows the transport: the Meta path sends an interactive list, while the
  // own-number (Baileys) and mock paths send a numbered text menu instead.
  const preview =
    order.logs.length === 0 && brand.template
      ? renderMessage({ ...order, brand: { name: brand.name } }, brand.template)
      : null;
  const previewIsList = modeOf(brand) === "meta";

  return (
    <Shell>
      <Link href="/" className="back"><Icon name="back" size={14} /> All orders</Link>
      <div className="page-head">
        <div>
          <div className="title-row">
            <h1>Order #{order.externalId}</h1>
            <span className={`badge ${STATUS_TONE[order.status] ?? "neutral"}`}>{STATUS_LABEL[order.status] || order.status}</span>
          </div>
          <p className="sub">
            Placed {order.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
            {sends > 0 && ` · Confirmation sent ${sends === 1 ? "once" : `${sends} times`}`}
          </p>
        </div>
        <form action={sendConfirmationAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <button className="btn primary"><Icon name="send" size={15} /> {sends ? "Resend confirmation" : "Send confirmation"}</button>
        </form>
      </div>

      {order.lastError && (
        <div className="callout bad">
          <Icon name="alert" />
          <div><b>Last send failed</b>{order.lastError}</div>
        </div>
      )}

      <div className="cols">
        <div className="card">
          <div>
            <h2>Conversation</h2>
            <p className="sub" style={{ fontSize: 13 }}>What the customer sees on WhatsApp.</p>
          </div>
          <div className="chat panel">
            {order.logs.length > 0 && <span className="day">TODAY</span>}
            {order.logs.length === 0 && (
              preview ? (
                <>
                  <span className="sys">
                    <Icon name="info" size={13} /> Not sent yet — this is what {order.customer.name || "the customer"} will get.
                  </span>
                  <div className="bubble in wide ghost" dir="auto">
                    {previewIsList ? (
                      <>
                        {preview.header && <span className="head">{preview.header}</span>}
                        <span dangerouslySetInnerHTML={{ __html: waToHtml(preview.body) }} />
                        <span className="list-btn"><Icon name="list" size={15} /> {buttonText}</span>
                      </>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: waToHtml(numberedMenu(preview)) }} />
                    )}
                  </div>
                  {previewIsList && preview.options.length > 0 && (
                    <div className="sheet ghost" dir="auto">
                      <div className="st">{preview.sectionTitle || "Options"}</div>
                      {preview.options.map((o) => (
                        <div key={o.rowId} className="opt">{o.label}<i /></div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="sys">
                  <Icon name="info" size={13} /> No message template yet — <Link href="/message">set one up</Link> first.
                </span>
              )
            )}
            {order.logs.map((log) => {
              const opts = JSON.parse(log.options || "[]") as { rowId: string; label: string }[];
              if (log.direction === "out") {
                return (
                  <div key={log.id} className={`bubble in${opts.length ? " wide" : ""}`} dir="auto">
                    <span dangerouslySetInnerHTML={{ __html: waToHtml(log.body) }} />
                    <span className="time">{clock(log.createdAt)}</span>
                    {opts.length > 0 && <span className="list-btn"><Icon name="list" size={15} /> {buttonText}</span>}
                  </div>
                );
              }
              return (
                <div key={log.id} className="bubble out" dir="auto">
                  {log.body}
                  <span className="time">{clock(log.createdAt)} <Icon name="checks" size={14} /></span>
                </div>
              );
            })}
            {waiting && <span className="sys"><Icon name="clock" size={13} /> Waiting for the customer to pick an option</span>}
          </div>

          {lastOpts.length > 0 && (
            <div className="simulate">
              <div className="status-line" style={{ fontSize: 13 }}><Icon name="flask" size={15} /> Simulate the customer’s reply</div>
              <p className="hint">Runs the real flow: adds the tag, sends the reply, then confirms or cancels the order.</p>
              <div className="opts">
                {lastOpts.map((o) => {
                  const [label, tone] = ACTION[actionFor(o.label)] ?? ACTION.custom;
                  return (
                    <form key={o.rowId} action={tapOptionAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="rowId" value={o.rowId} />
                      <input type="hidden" name="label" value={o.label} />
                      <button className="sim-opt"><b>{o.label}</b><span className={`badge ${tone}`}>{label}</span></button>
                    </form>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h2>Details</h2>
            <dl className="dl">
              <div><dt>Customer</dt><dd>{order.customer.name || "—"}</dd></div>
              <div><dt>Phone</dt><dd>{order.customer.phone}</dd></div>
              <div><dt>Total</dt><dd>{money(order.total)} {order.currency}</dd></div>
              <div>
                <dt>Order tag</dt>
                <dd>{tags.length ? tags.map((t) => <span key={t} className="tag"><Icon name="tag" size={12} />{t}</span>) : <span className="faint">None yet</span>}</dd>
              </div>
            </dl>
            <a className="btn block" href={`https://wa.me/${order.customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
              <Icon name="chat" size={15} /> Open chat in WhatsApp
            </a>
          </div>

          <div className="card">
            <div>
              <h2>Confirmation attempts</h2>
              <p className="sub" style={{ fontSize: 13 }}>Each send and what came back.</p>
            </div>
            {order.confirmations.length === 0 ? (
              <p className="hint">None yet.</p>
            ) : (
              <div className="timeline">
                {order.confirmations.map((c, i) => {
                  const [label, tone] = OUTCOME[c.outcome] ?? [c.outcome, "neutral"];
                  return (
                    <div key={c.id} className="tl">
                      <span className="ico"><Icon name="send" size={12} /></span>
                      <div className="body">
                        <div>
                          <b>{i === order.confirmations.length - 1 ? "First message" : "Reminder"} · {c.channel === "whatsapp" ? "WhatsApp" : c.channel}</b>
                          <span>Sent {clock(c.sentAt)}{c.repliedAt ? ` · Replied ${clock(c.repliedAt)}` : ""}</span>
                        </div>
                        <span className={`badge ${tone}`} style={{ alignSelf: "flex-start" }}>{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
