import Link from "next/link";
import Shell from "@/components/Shell";
import Icon from "@/components/Icon";
import { prisma, getBrand } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/constants";
import { timeAgo, money, STATUS_TONE } from "@/lib/format";
import { createOrder, seedDemo, resetDemo } from "@/app/actions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "All" },
  { key: "confirming", label: "Awaiting reply" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "received", label: "Not sent" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "", q = "" } = await searchParams;
  const brand = await getBrand();
  const all = await prisma.order.findMany({
    where: { brandId: brand.id },
    include: { customer: true },
    orderBy: { id: "desc" },
  });
  const hasTemplate = !!brand.template && brand.template.options.length > 0;

  const count = (s: string) => all.filter((o) => (s === "confirmed" ? o.status === "confirmed" || o.status === "shipped" : o.status === s)).length;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const today = all.filter((o) => o.createdAt >= startOfDay).length;
  const confirmed = count("confirmed"), cancelled = count("cancelled"), awaiting = count("confirming");
  const replies = confirmed + cancelled;
  const pct = (n: number) => (replies ? `${Math.round((n / replies) * 100)}%` : "—");
  const oldestAwaiting = all.filter((o) => o.status === "confirming").at(-1);

  const needle = q.trim().toLowerCase();
  const orders = all.filter((o) => {
    if (status && (status === "confirmed" ? !(o.status === "confirmed" || o.status === "shipped") : o.status !== status)) return false;
    if (!needle) return true;
    return [o.externalId, o.customer.name, o.customer.phone].some((v) => v.toLowerCase().includes(needle));
  });

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="sub">Every new order gets a WhatsApp confirmation. Replies update the order automatically.</p>
        </div>
        <a href="#test-order" className="btn"><Icon name="flask" /> Send test order</a>
      </div>

      {!hasTemplate && (
        <div className="callout warn">
          <Icon name="info" />
          <div style={{ flex: 1 }}>
            <b>Get started</b>
            Seed a demo store with a ready-made confirmation message and a sample order, then open it to test.
          </div>
          <form action={seedDemo}><button className="btn primary">Seed demo</button></form>
        </div>
      )}

      <div className="kpis">
        <Kpi label="Orders today" value={today} sub={`${all.length} in total`} />
        <Kpi label="Awaiting reply" value={awaiting} dot="var(--warn-fg)" sub={oldestAwaiting ? `Oldest: ${timeAgo(oldestAwaiting.createdAt)}` : "Nothing waiting"} />
        <Kpi label="Confirmed" value={confirmed} dot="var(--ok-fg)" sub={`${pct(confirmed)} of replies`} />
        <Kpi label="Cancelled" value={cancelled} dot="var(--bad-fg)" sub={`${pct(cancelled)} of replies`} />
      </div>

      <div className="card flush">
        <div className="toolbar">
          <div className="tabs">
            {TABS.map((t) => (
              <Link key={t.key} href={t.key ? `/?status=${t.key}` : "/"} className={`tab${status === t.key ? " on" : ""}`}>
                {t.label} <span>{t.key ? count(t.key) : all.length}</span>
              </Link>
            ))}
          </div>
          <form className="search">
            {status && <input type="hidden" name="status" value={status} />}
            <Icon name="search" />
            <input type="text" name="q" defaultValue={q} placeholder="Search order, name or phone" />
          </form>
        </div>
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Order tag</th><th>Placed</th><th /></tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const href = `/orders/${o.id}`;
              const tags = JSON.parse(o.tags || "[]") as string[];
              return (
                <tr key={o.id} className="click">
                  <td><Link href={href} className="cell-link primary-text">#{o.externalId}</Link></td>
                  <td><Link href={href} className="cell-link"><span className="primary-text">{o.customer.name || "—"}</span><span className="sec">{o.customer.phone}</span></Link></td>
                  <td className="num"><Link href={href} className="cell-link">{money(o.total)} {o.currency}</Link></td>
                  <td><Link href={href} className="cell-link"><span className={`badge ${STATUS_TONE[o.status] ?? "neutral"}`}>{STATUS_LABEL[o.status] || o.status}</span></Link></td>
                  <td>{tags.length ? tags.map((t) => <span key={t} className="tag"><Icon name="tag" size={12} />{t}</span>) : <span className="faint">—</span>}</td>
                  <td className="muted">{timeAgo(o.createdAt)}</td>
                  <td className="end"><Link href={href} className="faint" aria-label={`Open order ${o.externalId}`}><Icon name="chevronRight" /></Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="empty">
            <div className="ico"><Icon name="inbox" size={22} /></div>
            <b>{all.length ? "No orders match" : "No orders yet"}</b>
            <span className="muted">{all.length ? "Try another tab or search." : "New orders show up here as soon as they come in. Send a test order to see the flow."}</span>
          </div>
        )}
        {orders.length > 0 && <div className="table-foot">Showing {orders.length} of {all.length} orders</div>}
      </div>

      <div className="card" id="test-order">
        <div className="card-head">
          <div>
            <h2>Send a test order</h2>
            <p className="sub" style={{ fontSize: 13 }}>Creates a fake order and sends the confirmation to the WhatsApp number below, so you can see exactly what customers get.</p>
          </div>
          <form action={resetDemo}><button className="btn plain danger">Reset test data</button></form>
        </div>
        <form action={createOrder} className="row">
          <div className="field"><label>Customer name</label><input type="text" name="name" placeholder="Ziad" /></div>
          <div className="field"><label>Phone (their WhatsApp)</label><input type="text" name="phone" placeholder="+2010…" required /></div>
          <div className="field" style={{ flex: "0 0 160px", minWidth: 0 }}>
            <label>Total</label>
            <div className="affix"><input type="number" name="total" defaultValue={500} /><span className="suffix">EGP</span></div>
          </div>
          <button className="btn primary lg"><Icon name="send" size={15} /> Send test order</button>
        </form>
      </div>
    </Shell>
  );
}

function Kpi({ label, value, sub, dot }: { label: string; value: number; sub: string; dot?: string }) {
  return (
    <div className="kpi">
      <div className="k">{dot && <i style={{ background: dot }} />}{label}</div>
      <div className="v">{value}</div>
      <div className="s">{sub}</div>
    </div>
  );
}
