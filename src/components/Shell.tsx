"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";

const NAV = [
  { href: "/", label: "Orders" },
  { href: "/message", label: "Message" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/customers", label: "Customers" },
  { href: "/settings", label: "Settings" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/orders") : path.startsWith(href));
  return (
    <div className="layout">
      <aside className="side">
        <div className="brand"><span className="logo">✓</span> Confirm It</div>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="foot">
          <form action={logoutAction}>
            <button className="btn ghost sm" style={{ width: "100%" }}>Log out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
