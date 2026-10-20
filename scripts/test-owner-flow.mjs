import assert from "node:assert/strict";
import fs from "node:fs/promises";

// Test with a real, temporary Clerk session and isolated local SQLite storage.
// MAA_LOCAL_TEST_MODE only takes effect in development outside Vercel.
const base=new URL(process.argv[2]||"http://127.0.0.1:3002");
assert.ok(["127.0.0.1","localhost"].includes(base.hostname),"Local tests only.");
const {token,outsiderToken}=JSON.parse(await fs.readFile(process.env.MAA_QA_SESSION_FILE||".sites-runtime/owner-qa.json","utf8"));
async function request(path,{method="GET",body,owner=false,origin=base.origin}={}){
  const response=await fetch(new URL(path,base),{method,headers:{"Content-Type":"application/json",...(method!=="GET"?{Origin:origin}:{}),...(owner?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{data={html:text};}return {status:response.status,data,headers:response.headers};
}
assert.equal((await request("/api/admin/orders")).status,401);
if(outsiderToken){const denied=await fetch(new URL("/api/admin/orders",base),{headers:{Authorization:`Bearer ${outsiderToken}`}});assert.equal(denied.status,403,"A signed-in account with a different verified email must be denied.");}
assert.equal((await request("/api/cron/order-alerts")).status,401);
const key=crypto.randomUUID();
const response=await fetch(new URL("/api/orders",base),{method:"POST",headers:{"Content-Type":"application/json",Origin:base.origin,"Idempotency-Key":key},body:JSON.stringify({items:[{productId:"neem-tulsi",quantity:1},{productId:"rose-clay",quantity:1}],coupon:"WELCOME10",paymentMethod:"cod",customer:{name:"Packing Flow QA",email:"packing-qa@example.invalid",phone:"9899999999",address:"12 Test Lane, Sample Area",city:"Pune",state:"Maharashtra",postcode:"411001"}})});
assert.equal(response.status,201);const {order}=await response.json();
const path=`/api/admin/orders/${order.reference}`;
assert.equal((await request(path)).status,401);
assert.equal((await request(path,{method:"PATCH",body:{}})).status,401);
assert.equal((await request(`${path}/notify`,{method:"POST",body:{}})).status,401);
const listed=await request("/api/admin/orders",{owner:true});assert.equal(listed.status,200,JSON.stringify(listed.data));assert.match(listed.headers.get("cache-control"),/private.*no-store/);
const ownerPage=await request("/admin",{owner:true});assert.equal(ownerPage.status,200);assert.match(ownerPage.data.html,/Order book/);assert.match(ownerPage.data.html,/Packing Flow QA/);
const signIn=await request("/admin");assert.equal(signIn.status,307);assert.match(signIn.headers.get("location"),/\/admin\/sign-in/);
const detail=await request(path,{owner:true});assert.equal(detail.status,200,JSON.stringify(detail.data));assert.equal(detail.data.order.address,"12 Test Lane, Sample Area");assert.equal(detail.data.order.version,0);assert.ok(!("fingerprint" in detail.data.order));
const mutate=(body,origin)=>request(path,{method:"PATCH",owner:true,body,origin});
assert.equal((await mutate({expectedVersion:0,status:"packing",shipment:null},"https://evil.invalid")).status,403);
assert.equal((await mutate({expectedVersion:0,status:"shipped",shipment:null})).status,409);
assert.equal((await mutate({expectedVersion:0,status:"packing",shipment:null,unexpected:"field"})).status,400);
const packing=await mutate({expectedVersion:0,status:"packing",shipment:null});assert.equal(packing.status,200,JSON.stringify(packing.data));assert.equal(packing.data.order.status,"packing");
assert.equal((await mutate({expectedVersion:0,status:"packing",shipment:null})).status,409);
assert.equal((await mutate({expectedVersion:1,status:"shipped",shipment:null})).status,409);
const shipment={courier:"QA Courier",trackingNumber:"QA-123456",trackingUrl:"https://example.com/track/QA-123456"};
assert.equal((await mutate({expectedVersion:1,status:"shipped",shipment:{...shipment,trackingUrl:"javascript:alert(1)"}})).status,400);
assert.equal((await mutate({expectedVersion:1,status:"shipped",shipment:{...shipment,trackingUrl:"https://127.0.0.1/track"}})).status,400);
const simultaneous=await Promise.all([mutate({expectedVersion:1,status:"shipped",shipment}),mutate({expectedVersion:1,status:"shipped",shipment})]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
const track=await request("/api/orders/track",{method:"POST",body:{reference:order.reference,email:"packing-qa@example.invalid"}});
assert.equal(track.status,200);assert.equal(track.data.order.status,"shipped");assert.deepEqual(track.data.order.shipment,shipment);assert.equal(track.data.order.history.length,3);
for(const field of ["address","phone","fingerprint","email","actor"])assert.ok(!(field in track.data.order));
assert.ok(track.data.order.history.every(event=>!("actor" in event)));
assert.equal((await request("/api/orders/track",{method:"POST",body:{reference:order.reference,email:"wrong@example.invalid"}})).status,404);
const delivered=await mutate({expectedVersion:2,status:"delivered",shipment});assert.equal(delivered.status,200);assert.equal(delivered.data.order.version,3);
assert.equal((await mutate({expectedVersion:3,status:"packing",shipment})).status,409);
const notify=await request(`${path}/notify`,{method:"POST",body:{},owner:true});assert.equal(notify.status,503);assert.match(notify.data.error,/not connected/);
assert.equal((await request(path,{owner:true})).data.order.notification.state,"pending");
await fs.writeFile(".sites-runtime/owner-flow-result.json",JSON.stringify({reference:order.reference,email:"packing-qa@example.invalid",status:"delivered"}));
console.log("PASS: real Clerk owner session, unauthenticated denial, CSRF, private data, forward statuses, shipment validation, concurrent conflict, customer tracking, and honest email-pending state.");
