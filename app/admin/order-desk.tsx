"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";
import type { OwnerOrder, OwnerSummary } from "../../lib/owner-orders";
import { orderStatuses, statusLabel, type OrderStatus } from "../../lib/order-model";

const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount / 100);
const date = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
async function api<T=Record<string,unknown>>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json() as T & {error?:string};
  if (!response.ok) throw new Error(body.error || "Could not complete this request.");
  return body;
}

type InitialData={orders:OwnerSummary[];cursor:string|null;emailReady:boolean};
export default function OrderDesk({initialData,initialError="",loadedAt=""}:{initialData?:InitialData;initialError?:string;loadedAt?:string}) {
  const [orders, setOrders] = useState<OwnerSummary[]>(initialData?.orders??[]);
  const [cursor, setCursor] = useState<string | null>(initialData?.cursor??null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OwnerOrder | null>(null);
  const [opening, setOpening] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [refreshed, setRefreshed] = useState(loadedAt);
  const [emailReady,setEmailReady]=useState<boolean|null>(initialData?.emailReady??null);
  const detailRequest = useRef(0);

  async function load(next?: string) {
    setLoading(true); setError("");
    try {
      const data = await api<{orders:OwnerSummary[];cursor:string|null;emailReady:boolean}>(`/api/admin/orders${next ? `?cursor=${encodeURIComponent(next)}` : ""}`);
      setOrders(old => next ? Array.from(new Map([...old, ...data.orders].map(order => [order.reference, order])).values()) : data.orders);
      setCursor(data.cursor); setEmailReady(data.emailReady);setRefreshed(new Date().toISOString());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function openOrder(reference: string) {
    const request = ++detailRequest.current;
    setOpening(true); setDetailError(""); setSelected(null);
    try {
      const data = await api<{order:OwnerOrder}>(`/api/admin/orders/${encodeURIComponent(reference.trim().toUpperCase())}`);
      if (request === detailRequest.current) setSelected(data.order);
    } catch (e) { if (request === detailRequest.current) setDetailError((e as Error).message); }
    finally { if (request === detailRequest.current) setOpening(false); }
  }
  function changed(order: OwnerOrder) {
    setSelected(order);
    setOrders(rows => rows.map(row => row.reference === order.reference ? { ...row, status: order.status, notification: order.notification.state } : row));
  }
  const matching = orders.filter(order => `${order.reference} ${order.name} ${order.city}`.toLowerCase().includes(search.trim().toLowerCase()));
  const shown = matching.filter(order => filter === "all" || order.status === filter).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const waiting = orders.filter(order => order.status === "received").length;

  return <div className="owner-shell">
    <aside className="owner-sidebar"><Link className="owner-brand" href="/">maa <span>soaps</span></Link>
      <span className="owner-scope">Shop owner · India</span>
      <nav aria-label="Shop owner"><a href="/admin" aria-current="page">Orders <span>{waiting} received</span></a><a href="/" target="_blank" rel="noreferrer">View storefront ↗</a></nav>
      <div className="owner-sidebar-bottom"><p>Pack with a little care.</p><SignOutButton redirectUrl="/admin/sign-in"><button>Sign out</button></SignOutButton></div>
    </aside>
    <main className="owner-main">
      <header className="owner-title"><div><h1>Orders</h1><p>{loading && !orders.length ? "Loading your order book…" : `${orders.length} orders loaded · ${waiting} waiting to be packed`}</p></div>
        <button className="owner-button secondary" onClick={()=>load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh orders"}</button></header>
      {emailReady===false&&<div className="owner-notice owner-email-setup"><p>Email alerts are awaiting setup. New orders are saved in this dashboard; automatic alerts will start once the email service is connected.</p><a href="https://vercel.com/swamishubham2005-4746/maa-soaps/settings/environment-variables" target="_blank" rel="noreferrer">Open email settings ↗</a></div>}
      <div className="owner-filter-strip" aria-label="Filter orders by status">
        {(["all", ...orderStatuses] as const).map(value=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}><span>{value==="all"?"All orders":statusLabel[value]}</span><strong>{value==="all"?matching.length:matching.filter(order=>order.status===value).length}</strong></button>)}
      </div>
      <form className="owner-search" onSubmit={event=>{event.preventDefault();if(/^MAA-[0-9A-F]{12}$/i.test(search.trim()))void openOrder(search);}}>
        <label htmlFor="owner-search">Find an order</label><input id="owner-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Name, city, or order reference" />
        <button className="owner-button secondary" type="submit" disabled={!/^MAA-[0-9A-F]{12}$/i.test(search.trim())}>Open reference</button>
      </form>
      <div className="owner-workspace">
        <section className="owner-orders" aria-label="Order list"><div className="owner-section-heading"><h2>Order book</h2><span>{shown.length} shown{cursor ? " · More available" : ""}</span></div>
          {error && <div className="owner-notice" role="alert"><p>{error}</p><button onClick={()=>load()}>Retry loading</button></div>}
          {loading && !orders.length ? <p className="owner-empty">Loading orders…</p> : shown.length ? <div className="owner-table-frame"><table><thead><tr><th>Customer / order</th><th>Soaps</th><th>Total / COD</th><th>Status</th><th><span className="sr-only">Open order</span></th></tr></thead>
            <tbody>{shown.map(order=><tr key={order.reference} data-selected={selected?.reference===order.reference}><td><span>{order.name}</span><small>{order.city} · {date(order.createdAt)}</small><code>{order.reference}</code></td><td className="num">{order.quantity}</td><td className="num"><strong>{money(order.total)}</strong><small>{order.notification==="sent"?"Alert sent":"Alert pending"}</small></td><td><span className={`owner-state ${order.status}`}>{statusLabel[order.status]}</span></td><td><button className="owner-open" onClick={()=>openOrder(order.reference)} aria-label={`Open ${order.reference}`}>Open ↗</button></td></tr>)}</tbody></table></div>
            : <div className="owner-empty"><h3>{orders.length ? "No matching orders" : "Your first order starts here."}</h3><p>{orders.length ? "Try another name or status. Full order references can be opened directly." : "New checkout orders will appear here. Open one to check the soap quantities and begin packing."}</p><Link href="/">View your shop ↗</Link></div>}
          <div className="owner-list-footer"><span>{refreshed ? `Updated ${date(refreshed)} IST` : ""}<small>Newest first within loaded orders. Refresh checks for new orders.</small></span>{cursor&&<button className="owner-button secondary" disabled={loading} onClick={()=>load(cursor)}>Load 25 more</button>}</div>
        </section>
        <section className={`owner-detail ${selected||opening||detailError?"is-open":""}`} aria-label="Order details">
          <button className="owner-back" onClick={()=>{detailRequest.current++;setSelected(null);setOpening(false);setDetailError("");}}>← Back to orders</button>
          {opening ? <p className="owner-empty" role="status">Opening order…</p> : detailError ? <div className="owner-empty" role="alert"><h2>Could not open this order</h2><p>{detailError}</p></div> : selected ? <OrderDetail key={`${selected.reference}-${selected.version}`} order={selected} emailReady={Boolean(emailReady)} onChanged={changed} onRefresh={()=>openOrder(selected.reference)} /> : <div className="owner-empty owner-detail-intro"><h2>Ready for the packing table.</h2><p>Open an order to see its soaps, delivery address, and courier details in one place.</p><Image src="/maa-assets/neem.svg" alt="Botanical neem soap illustration" width={180} height={180} /></div>}
        </section>
      </div>
    </main>
  </div>;
}

function OrderDetail({order,emailReady,onChanged,onRefresh}:{order:OwnerOrder;emailReady:boolean;onChanged:(order:OwnerOrder)=>void;onRefresh:()=>void}) {
  const initialStatus=order.status==="received"?"packing":order.status==="packing"?"shipped":order.status;
  const [status,setStatus]=useState<OrderStatus>(initialStatus);
  const [saving,setSaving]=useState(false),[error,setError]=useState(""),[sent,setSent]=useState(false);
  const currentIndex=orderStatuses.indexOf(order.status);
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setSaving(true);setError("");
    const form=new FormData(event.currentTarget);
    const courier=String(form.get("courier")||"").trim(),trackingNumber=String(form.get("trackingNumber")||"").trim(),trackingUrl=String(form.get("trackingUrl")||"").trim();
    try {
      const data=await api<{order:OwnerOrder}>(`/api/admin/orders/${order.reference}`,{method:"PATCH",body:JSON.stringify({expectedVersion:order.version,status,shipment:courier||trackingNumber||trackingUrl?{courier,trackingNumber,trackingUrl}:null})});
      onChanged(data.order);
    } catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  async function retryAlert() {
    setSaving(true);setError("");
    try{await api(`/api/admin/orders/${order.reference}/notify`,{method:"POST",body:"{}"});setSent(true);onRefresh();}
    catch(e){setError((e as Error).message);}finally{setSaving(false);}
  }
  return <div className="owner-order-sheet">
    <div className="owner-section-heading"><div><h2>{order.reference}</h2><p>{date(order.createdAt)} IST</p></div><span className={`owner-state ${order.status}`}>{statusLabel[order.status]}</span></div>
    <section className="owner-packing"><h3>Pack these soaps</h3>{order.items.map(item=><div className="owner-pack-line" key={item.productId}><span>{item.name}</span><strong className="num">× {item.quantity}</strong></div>)}
      <div className="owner-pack-total"><span>Collect on delivery</span><strong className="num">{money(order.total)}</strong></div>
      <dl className="owner-pricing"><div><dt>Soaps</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Discount</dt><dd>−{money(order.discount)}</dd></div><div><dt>Delivery</dt><dd>{money(order.shipping)}</dd></div></dl>
    </section>
    <section className="owner-address"><h3>Deliver to</h3><address><strong>{order.name}</strong><br/>{order.address}<br/>{order.city}, {order.state} {order.postcode}<br/>India</address><a href={`tel:${order.phone}`}>{order.phone}</a><a href={`mailto:${order.email}`}>{order.email}</a><button className="owner-button secondary" onClick={()=>window.print()}>Print packing slip</button></section>
    <section className="owner-alert"><h3>Order email alert</h3><p>{order.notification.state==="sent"?`Accepted by email provider ${date(order.notification.sentAt!)} IST.`:emailReady?"An alert has not been confirmed as sent. You can retry it without creating another order.":"Email delivery is awaiting setup. This order is saved and can be packed from this page."}</p>{order.notification.state!=="sent"&&emailReady&&<button className="owner-button secondary" disabled={saving||sent} onClick={retryAlert}>{saving?"Sending…":"Retry owner alert"}</button>}</section>
    <form className="owner-shipment" onSubmit={save}><h3>Packing & delivery</h3><label htmlFor="order-status">Order status</label><select id="order-status" value={status} onChange={event=>setStatus(event.target.value as OrderStatus)} disabled={saving||order.status==="delivered"}>{orderStatuses.map((value,index)=><option key={value} value={value} disabled={index<currentIndex||index>currentIndex+1}>{statusLabel[value]}</option>)}</select>
      <label htmlFor="order-courier">Courier name</label><input id="order-courier" name="courier" defaultValue={order.shipment?.courier||""} placeholder="e.g. India Post" maxLength={80} required={status==="shipped"||status==="delivered"} disabled={order.status==="delivered"}/>
      <label htmlFor="order-tracking-number">Tracking / AWB number</label><input id="order-tracking-number" name="trackingNumber" defaultValue={order.shipment?.trackingNumber||""} maxLength={100} required={status==="shipped"||status==="delivered"} disabled={order.status==="delivered"}/>
      <label htmlFor="order-tracking-url">Courier tracking link</label><input id="order-tracking-url" name="trackingUrl" type="url" placeholder="https://…" defaultValue={order.shipment?.trackingUrl||""} maxLength={1000} required={status==="shipped"||status==="delivered"} disabled={order.status==="delivered"}/>
      <p className="owner-hint">Customers can see these courier details in “Track an order.” Book the courier separately, then paste its tracking link here. Delivery status is updated by you.</p>
      {error&&<div className="owner-notice" role="alert"><p>{error}</p><button type="button" onClick={onRefresh}>Refresh this order</button></div>}
      <button className="owner-button" disabled={saving||order.status==="delivered"}>{saving?"Saving…":order.status==="delivered"?"Delivered":status==="packing"&&order.status==="received"?"Start packing":status==="shipped"&&order.status==="packing"?"Save shipment & mark shipped":status==="delivered"?"Mark delivered":"Save changes"}</button>
    </form>
    <section className="owner-history"><h3>Order history</h3><ol><li><span>Received</span><time>{date(order.createdAt)} IST</time></li>{order.history.map(event=><li key={event.version}><span>{statusLabel[event.status]}</span><time>{date(event.createdAt)} IST</time></li>)}</ol></section>
  </div>;
}
