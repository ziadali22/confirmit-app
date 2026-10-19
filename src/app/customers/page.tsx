import Link from "next/link";
import Shell from "@/components/Shell";
import Icon from "@/components/Icon";
import { prisma, getBrand } from "@/lib/db";
import { toggleOptIn } from "@/app/actions";
import { initials, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const AVATAR = ["#ffd6a5", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff", "#fdffb6", "#a0c4ff", "#ffadad"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "", q = "" } = await searchParams;
  const brand = await getBrand();
  const all = await prisma.customer.findMany({
    where: { brandId: brand.id },
    orderBy: { id: "desc" },
    include: { orders: { select: { createdAt: true }, orderBy: { id: "desc" } } },
  });
  const isIn = (c: (typeof all)[number]) => c.optIn && !c.optedOutAt;
  const reachable = all.filter(isIn).length;
  const needle = q.trim().toLowerCase();
  const customers = all.filter((c) => {
    if (f === "in" && !isIn(c)) return false;
    if (f === "out" && isIn(c)) return false;
    return !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(needle);
  });
  const tabs = [
    { key: "", label: "All", n: all.length },
    { key: "in", label: "Opted in", n: reachable },
    { key: "out", label: "Opted out", n: all.length - reachable },
  ];

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="sub">Everyone who has ordered is saved here. {reachable} of {all.length} opted in to marketing.</p>
        </div>
      </div>

      <div className="card flush">
        <div className="toolbar">
          <div className="tabs">
            {tabs.map((t) => (
              <Link key={t.key} href={t.key ? `/customers?f=${t.key}` : "/customers"} className={`tab${f === t.key ? " on" : ""}`}>
                {t.label} <span>{t.n}</span>
              </Link>
            ))}
          </div>
          <form className="search">
            {f && <input type="hidden" name="f" value={f} />}
            <Icon name="search" />
            <input type="text" name="q" defaultValue={q} placeholder="Search name or phone" />
          </form>
        </div>
        <table>
          <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Last order</th><th>Marketing</th><th /></tr></thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <span className="avatar" style={{ background: AVATAR[i % AVATAR.length] }}>{initials(c.name || c.phone)}</span>
                  <span className="primary-text">{c.name || "—"}</span>
                </td>
                <td className="num">{c.phone}</td>
                <td className="num">{c.orders.length}</td>
                <td className="muted">{c.orders[0] ? timeAgo(c.orders[0].createdAt) : "—"}</td>
                <td>{isIn(c) ? <span className="badge ok">Opted in</span> : <span className="badge neutral">Opted out</span>}</td>
                <td className="end">
                  <form action={toggleOptIn}>
                    <input type="hidden" name="customerId" value={c.id} />
                    <button className="btn plain sm">{c.optIn ? "Opt out" : "Opt in"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="empty">
            <div className="ico"><Icon name="users" size={22} /></div>
            <b>{all.length ? "No customers match" : "No customers yet"}</b>
            <span className="muted">{all.length ? "Try another tab or search." : "They’re added automatically from orders."}</span>
          </div>
        )}
        <div className="table-foot">Customers who opt out never receive campaigns. Order confirmations still send.</div>
      </div>
    </Shell>
  );
}
