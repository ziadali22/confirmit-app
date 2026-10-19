import Shell from "@/components/Shell";
import { getBrand } from "@/lib/db";
import MessageBuilder from "@/components/MessageBuilder";

export const dynamic = "force-dynamic";

export default async function MessagePage() {
  const brand = await getBrand();
  const t = brand.template;
  const initial = {
    header: t?.header ?? "Order Confirmation Required",
    body: t?.body ?? "Thank You {firstName} 🎉\n\nYour order {orderNumber} from {shopName} ({total} {currency}) is being processed.",
    sectionTitle: t?.sectionTitle ?? "Order Confirmation",
    buttonText: t?.buttonText ?? "Select Payment",
    options: (t?.options ?? []).map((o) => ({ label: o.label, orderTag: o.orderTag, responseMessage: o.responseMessage, action: o.action })),
    shopName: brand.name,
  };
  return (
    <Shell>
      <h1>Confirmation message</h1>
      <p className="sub">Full control over what customers receive. Use placeholders like <code>{"{firstName}"}</code> — they fill in per order.</p>
      <MessageBuilder initial={initial} />
    </Shell>
  );
}
