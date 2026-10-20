import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

// Compile lib/order-notifications.ts to .sites-runtime/email-unit first.
// All provider HTTP responses below are test doubles; no real email is sent.
const root=process.cwd();
registerHooks({resolve(specifier,context,next){if(specifier==="server-only")return {url:pathToFileURL(path.join(root,"node_modules/next/dist/compiled/server-only/empty.js")).href,shortCircuit:true};return next(specifier,context);}});
const storage=await import(pathToFileURL(path.join(root,".sites-runtime/email-unit/order-storage.js")));
const alerts=await import(pathToFileURL(path.join(root,".sites-runtime/email-unit/order-notifications.js")));
const directory=await fs.mkdtemp(path.join(root,".sites-runtime/email-outbox-test-"));
process.chdir(directory);process.env.NODE_ENV="development";
for(const name of ["BLOB_STORE_ID","BLOB_READ_WRITE_TOKEN","VERCEL","MAA_LOCAL_TEST_MODE"])delete process.env[name];
process.env.RESEND_API_KEY="unit-test-only";process.env.ORDER_ALERT_EMAIL="owner@example.invalid";
process.env.ORDER_ALERT_FROM="Maa Soaps <onboarding@resend.dev>";
const template={fingerprint:"unit",name:"Outbox QA",email:"qa@example.invalid",phone:"9899999999",address:"12 Test Lane",city:"Pune",state:"Maharashtra",postcode:"411001",subtotal:25000,discount:0,shipping:6000,total:31000,currency:"INR",coupon:"",status:"received",paymentMethod:"cod",createdAt:new Date().toISOString(),items:[{productId:"neem-tulsi",name:"Neem & Tulsi",quantity:1,unitPrice:25000,total:25000}]};
let calls=0;
globalThis.fetch=async(url,options)=>{assert.equal(url,"https://api.resend.com/emails");calls++;const body=JSON.parse(options.body);assert.deepEqual(body.to,["owner@example.invalid"]);assert.match(body.text,/Neem & Tulsi × 1/);assert.match(body.text,/12 Test Lane/);assert.match(options.headers["Idempotency-Key"],/^maa-order-MAA-/);return new Response(JSON.stringify(calls===1?{message:"retry"}:{id:"email-qa"}),{status:calls===1?429:200});};
const ref="MAA-AAAAAAAAAAAA";
await storage.createOrder({...template,reference:ref});await alerts.queueOrderAlert(ref);
assert.equal(await alerts.sendOrderAlert(ref),"sent");assert.equal(calls,2);
assert.equal(await alerts.sendOrderAlert(ref),"sent");assert.equal(calls,2,"Saved receipts prevent repeat emails.");
assert.equal((await storage.listDocuments("email-jobs/")).paths.length,0);
await storage.createDocument(`email-jobs/${ref}.json`,{reference:ref,queuedAt:new Date().toISOString()});
await alerts.processAlertQueue();assert.equal(calls,2);assert.equal((await storage.listDocuments("email-jobs/")).paths.length,0,"A stale acknowledged queue entry is cleaned up.");
const concurrent="MAA-BBBBBBBBBBBB";await storage.createOrder({...template,reference:concurrent});calls=0;
globalThis.fetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return new Response(JSON.stringify({id:"email-concurrent"}),{status:200});};
const states=await Promise.all([alerts.sendOrderAlert(concurrent),alerts.sendOrderAlert(concurrent)]);assert.ok(states.includes("sent"));assert.equal(calls,1,"Shared lease prevents concurrent delivery attempts.");
const failed="MAA-CCCCCCCCCCCC";await storage.createOrder({...template,reference:failed});
globalThis.fetch=async()=>new Response(JSON.stringify({message:"invalid"}),{status:403});
await assert.rejects(alerts.sendOrderAlert(failed),/did not accept/);
assert.equal(await storage.readDocument(`notifications/${failed}/sent.json`),null);
assert.ok((await storage.listDocuments("email-jobs/")).paths.some(p=>p.includes(failed)),"Failed alerts stay queued.");
delete process.env.RESEND_API_KEY;await assert.rejects(alerts.sendOrderAlert(failed),/not connected/);
console.log("PASS: owner email contents, retry, stable idempotency, concurrent delivery lease, durable receipt, queue cleanup, provider failure, and missing credentials. Provider responses were mocked; live delivery is not verified.");
