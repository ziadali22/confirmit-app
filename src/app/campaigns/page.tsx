import Shell from "@/components/Shell";
import { prisma, getBrand } from "@/lib/db";
import { createCampaign, sendCampaign } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const brand = await getBrand();
  const campaigns = await prisma.campaign.findMany({
    where: { brandId: brand.id },
    orderBy: { id: "desc" },
    include: { _count: { select: { recipients: true } } },
  });
  const reachable = await prisma.customer.count({ where: { brandId: brand.id, optIn: true, optedOutAt: null } });

  return (
    <Shell>
      <h1>Marketing campaigns</h1>
      <p className="sub">Send a WhatsApp message to all opted-in customers ({reachable} reachable).</p>

      <div className="card">
        <h2>New campaign</h2>
        <form action={createCampaign}>
          <label>Name (internal)</label>
          <input type="text" name="name" placeholder="October sale" required />
          <label>Message</label>
          <textarea name="body" placeholder="Hi {firstName}! 🎉 20% off this week at {shopName}..." required />
          <p className="hint">Placeholders: {"{firstName}"}, {"{shopName}"}. Real WhatsApp marketing needs an approved template + opt-in — see notes below.</p>
          <button className="btn">Create campaign</button>
        </form>
      </div>

      <div className="card">
        <h2>Campaigns</h2>
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Sent to</th><th></th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}<br /><span className="muted" style={{ fontSize: 12 }}>{c.body.slice(0, 50)}…</span></td>
                <td><span className={`pill ${c.status === "sent" ? "s-confirmed" : "s-confirming"}`}>{c.status}</span></td>
                <td>{c._count.recipients || 0}</td>
                <td>
                  <form action={sendCampaign}>
                    <input type="hidden" name="campaignId" value={c.id} />
                    <button className="btn green sm">Send now</button>
                  </form>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && <tr><td colSpan={4} className="muted">No campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="hint">⚠️ WhatsApp marketing from a business number requires a Meta-approved MARKETING template and explicit opt-in; spammy bulk sends get numbers throttled or banned.</p>
    </Shell>
  );
}
