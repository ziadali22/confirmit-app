import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confirm It",
  description: "WhatsApp order confirmation dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
