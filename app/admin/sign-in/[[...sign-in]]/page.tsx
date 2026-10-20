import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return <main className="owner-login"><Link className="owner-brand" href="/">maa <span>soaps</span></Link>
    <h1>Shop owner sign-in</h1><p>Sign in with the shop owner’s verified email to manage orders.</p>
    <SignIn path="/admin/sign-in" routing="path" signUpUrl="/admin/sign-up" fallbackRedirectUrl="/admin" />
    <Link href="/">Back to the storefront</Link></main>;
}
