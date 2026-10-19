import Shell from "@/components/Shell";
import { prisma, getBrand } from "@/lib/db";
import { toggleOptIn } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const brand = await getBrand();
  const customers = await prisma.customer.findMany({
    where: { brandId: brand.id },
    orderBy: { id: "desc" },
  });
  const reachable = customers.filter((c) => c.optIn && !c.optedOutAt).length;

  return (
    <Shell>
      <h1>Customers</h1>
      <p className="sub">Every number that ordered is saved here. {reachable} of {customers.length} are opted-in for marketing campaigns.</p>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Marketing opt-in</th><th></th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name || <span className="muted">—</span>}</td>
                <td>{c.phone}</td>
                <td>{c.optIn && !c.optedOutAt ? <span className="pill s-confirmed">opted in</span> : <span className="pill s-cancelled">opted out</span>}</td>
                <td>
                  <form action={toggleOptIn}>
                    <input type="hidden" name="customerId" value={c.id} />
                    <button className="btn ghost sm">{c.optIn ? "Opt out" : "Opt in"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={4} className="muted">No customers yet — they’re added automatically from orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
