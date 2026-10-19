import { prisma, getBrand } from "@/lib/db";
import SideNav from "@/components/SideNav";

// Server wrapper: loads the store once so the sidebar can show the sender,
// the awaiting-reply count and how messages are being sent.
export default async function Shell({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  const awaiting = await prisma.order.count({ where: { brandId: brand.id, status: "confirming" } });
  return (
    <div className="layout">
      <SideNav
        storeName={brand.name}
        sender={brand.whatsappNumber}
        waMode={brand.waMode}
        awaiting={awaiting}
      />
      <main className="main">{children}</main>
    </div>
  );
}
