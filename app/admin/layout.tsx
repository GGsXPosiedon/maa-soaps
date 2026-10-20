import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./admin.css";

export const metadata: Metadata = { title: "Orders · Maa Soaps", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider signInUrl="/admin/sign-in" signUpUrl="/admin/sign-up"
    signInFallbackRedirectUrl="/admin" signUpFallbackRedirectUrl="/admin"
    appearance={{ variables: { colorPrimary: "#272721", borderRadius: "6px" } }}>
    <div className="owner-app" data-ui>{children}</div>
  </ClerkProvider>;
}
