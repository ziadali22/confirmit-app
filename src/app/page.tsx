import Link from "next/link";
import Shell from "@/components/Shell";
import { prisma, getBrand } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/constants";
import { createOrder, seedDemo, resetDemo } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const brand = await getBrand();
  const orders = await prisma.order.findMany({
    where: { brandId: brand.id },
    include: { customer: true },
    orderBy: { id: "desc" },
  });
  const hasTemplate = !!brand.template && brand.template.options.length > 0;

  return (
    <Shell>
      <h1>Orders</h1>
      <p className="sub">{brand.name} · sender {brand.whatsappNumber || "— not set"} {brand.mock && "· (mock mode)"}</p>

      {!hasTemplate && (
        <div className="card" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
          <b>Get started:</b> seed a demo store with a ready-made confirmation message and a sample order, then open it to test.
          <div style={{ marginTop: 12 }}>
            <form action={seedDemo} style={{ display: "inline" }}><button className="btn green">Seed demo</button></form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
          <form action={createOrder} className="row" style={{ alignItems: "flex-end", gap: 12 }}>
            <div><label>Customer name</label><input type="text" name="name" placeholder="Ziad" /></div>
            <div><label>Phone (their WhatsApp)</label><input type="text" name="phone" placeholder="+2010..." required /></div>
            <div style={{ width: 110 }}><label>Total</label><input type="number" name="total" defaultValue={500} /></div>
            <button className="btn">+ Test order</button>
          </form>
          <form action={resetDemo}><button className="btn danger sm">Reset</button></form>
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Tags</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.externalId}</td>
                <td>{o.customer.name}<br /><span className="muted">{o.customer.phone}</span></td>
                <td>{o.total} {o.currency}</td>
                <td><span className={`pill s-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                <td className="muted">{(JSON.parse(o.tags || "[]") as string[]).join(", ")}</td>
                <td><Link href={`/orders/${o.id}`}>Open →</Link></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="muted">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
