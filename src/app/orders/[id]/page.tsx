import Link from "next/link";
import Shell from "@/components/Shell";
import { prisma } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/constants";
import { waToHtml } from "@/lib/messaging";
import { sendConfirmationAction, tapOptionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { customer: true, logs: { orderBy: { id: "asc" } }, confirmations: true },
  });
  if (!order) return <Shell><p>Order not found.</p></Shell>;
  const tags = JSON.parse(order.tags || "[]") as string[];

  return (
    <Shell>
      <Link href="/" className="muted">← all orders</Link>
      <h1 style={{ marginTop: 8 }}>Order #{order.externalId} <span className={`pill s-${order.status}`}>{STATUS_LABEL[order.status]}</span></h1>
      {order.lastError && (
        <div className="card" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}>
          <b>Last send failed:</b> {order.lastError}
        </div>
      )}

      <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
        {/* phone simulator */}
        <div>
          <div className="phone">
            <div className="bar"><div className="av">✓</div><div><b>Customer</b><br /><span style={{ fontSize: 11, opacity: .8 }}>{order.customer.phone}</span></div></div>
            <div className="scr">
              {order.logs.length === 0 && <div className="muted" style={{ margin: "auto", fontSize: 13 }}>No messages yet →</div>}
              {order.logs.map((log) => {
                const opts = JSON.parse(log.options || "[]") as { rowId: string; label: string }[];
                if (log.direction === "out") {
                  return (
                    <div key={log.id} className="bubble out">
                      <span dangerouslySetInnerHTML={{ __html: waToHtml(log.body) }} />
                      {opts.length > 0 && (
                        <div style={{ marginTop: 8, borderTop: "1px solid #eee", paddingTop: 6 }}>
                          {opts.map((o) => (
                            <form key={o.rowId} action={tapOptionAction}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <input type="hidden" name="rowId" value={o.rowId} />
                              <input type="hidden" name="label" value={o.label} />
                              <button className="optbtn">{o.label}</button>
                            </form>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return <div key={log.id} className="bubble in">{log.body}</div>;
              })}
            </div>
            <div className="foot" />
          </div>
          <form action={sendConfirmationAction} style={{ marginTop: 12, width: 320 }}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn green" style={{ width: "100%" }}>Send confirmation message</button>
          </form>
          <p className="hint">Tapping a row runs the real inbound flow (apply tag → reply → confirm/cancel).</p>
        </div>

        {/* order state */}
        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <h2>Details</h2>
          <table>
            <tbody>
              <tr><th>Customer</th><td>{order.customer.name} ({order.customer.phone})</td></tr>
              <tr><th>Total</th><td>{order.total} {order.currency}</td></tr>
              <tr><th>Tags</th><td>{tags.length ? tags.map((t) => <span key={t} className="pill s-confirmed" style={{ marginRight: 4 }}>{t}</span>) : <span className="muted">none</span>}</td></tr>
            </tbody>
          </table>
          <h2 style={{ marginTop: 18 }}>Confirmation attempts</h2>
          <table>
            <thead><tr><th>Channel</th><th>Outcome</th><th>Replied</th></tr></thead>
            <tbody>
              {order.confirmations.map((c) => (
                <tr key={c.id}><td>{c.channel}</td><td>{c.outcome}</td><td className="muted">{c.repliedAt ? new Date(c.repliedAt).toLocaleTimeString() : "—"}</td></tr>
              ))}
              {order.confirmations.length === 0 && <tr><td colSpan={3} className="muted">None yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
