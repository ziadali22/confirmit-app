import Shell from "@/components/Shell";
import Icon from "@/components/Icon";
import CampaignForm from "@/components/CampaignForm";
import { prisma, getBrand } from "@/lib/db";
import { sendCampaign } from "@/app/actions";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  draft: ["Draft", "neutral"],
  sending: ["Sending", "warn"],
  sent: ["Sent", "ok"],
};

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
      <div className="page-head">
        <div>
          <h1>Campaigns</h1>
          <p className="sub">Send one WhatsApp message to every customer who opted in.</p>
        </div>
      </div>

      <div className="callout warn">
        <Icon name="alert" />
        <div>
          <b>Marketing needs an approved template and opt-in</b>
          WhatsApp requires a Meta-approved MARKETING template and explicit opt-in. Bulk sends from a regular number get throttled or banned.
        </div>
      </div>

      <CampaignForm shopName={brand.name} reachable={reachable} />

      <div className="card flush">
        <div className="toolbar" style={{ padding: "14px 20px" }}><h2>Past campaigns</h2></div>
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Sent to</th><th>Created</th><th /></tr></thead>
          <tbody>
            {campaigns.map((c) => {
              const [label, tone] = STATUS[c.status] ?? [c.status, "neutral"];
              return (
                <tr key={c.id}>
                  <td><span className="primary-text">{c.name}</span><span className="sec">{c.body.length > 60 ? `${c.body.slice(0, 60)}…` : c.body}</span></td>
                  <td><span className={`badge ${tone}`}>{label}</span></td>
                  <td className="num">{c._count.recipients || 0}</td>
                  <td className="muted">{timeAgo(c.createdAt)}</td>
                  <td className="end">
                    <form action={sendCampaign}>
                      <input type="hidden" name="campaignId" value={c.id} />
                      <button className={`btn sm${c.status === "sent" ? "" : " primary"}`}><Icon name="send" size={13} /> Send now</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="empty">
            <div className="ico"><Icon name="megaphone" size={22} /></div>
            <b>No campaigns yet</b>
            <span className="muted">Campaigns you create show up here, with how many people got them.</span>
          </div>
        )}
      </div>
    </Shell>
  );
}
