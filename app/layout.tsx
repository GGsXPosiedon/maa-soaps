import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maa Soaps — A little care, every day",
  description: "A botanical soap collection inspired by familiar ingredients and everyday rituals of care.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
