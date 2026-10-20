import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { OwnerAccessError, requireOwner } from "../../lib/owner-auth";
import { ownerOrderPage } from "../../lib/owner-orders";
import OrderDesk from "./order-desk";

export const dynamic = "force-dynamic";
export default async function OwnerPage() {
  try { await requireOwner(); }
  catch (error) {
    if (error instanceof OwnerAccessError && error.status === 401) redirect("/admin/sign-in");
    return <main className="owner-login"><h1>Owner access required</h1>
      <p>{error instanceof OwnerAccessError ? error.message : "Sign-in is temporarily unavailable."}</p>
      <SignOutButton redirectUrl="/admin/sign-in"><button className="owner-button">Use another account</button></SignOutButton>
      <Link href="/">Back to the storefront</Link></main>;
  }
  let initialData:Awaited<ReturnType<typeof ownerOrderPage>>|undefined;
  let initialError="";
  try{initialData=await ownerOrderPage();}
  catch{initialError="Could not load the order book. Please retry.";}
  return <OrderDesk initialData={initialData} initialError={initialError} loadedAt={new Date().toISOString()} />;
}
