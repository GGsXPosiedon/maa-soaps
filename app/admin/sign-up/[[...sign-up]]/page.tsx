import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return <main className="owner-login"><Link className="owner-brand" href="/">maa <span>soaps</span></Link>
    <h1>Set up owner sign-in</h1><p>Only the configured shop owner’s verified email can access orders.</p>
    <SignUp path="/admin/sign-up" routing="path" signInUrl="/admin/sign-in" fallbackRedirectUrl="/admin" />
    <Link href="/admin/sign-in">Already set up? Sign in</Link></main>;
}
