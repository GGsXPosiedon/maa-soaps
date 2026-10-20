import { get, put, list } from "@vercel/blob";
import { type Fulfilment, type OrderEvent, type OrderStatus } from "./order-model";
import { fulfilmentUpdate, validateTransition, OrderConflictError } from "./order-validation";
export type SavedOrder = {
  reference:string; fingerprint:string; name:string; email:string; phone:string; address:string; city:string; state:string; postcode:string;
  subtotal:number;discount:number;shipping:number;total:number;currency:"INR";coupon:string;status:OrderStatus;paymentMethod:"cod";createdAt:string;
  items:{productId:string;name:string;quantity:number;unitPrice:number;total:number}[];
};
let localPromise:Promise<import("node:sqlite").DatabaseSync>|undefined;
async function localDb(){
  if(process.env.VERCEL||process.env.NODE_ENV!=="development")throw new Error("Connect a private Vercel Blob store before accepting orders.");
  localPromise??=(async()=>{const {DatabaseSync}=await import("node:sqlite");const fs=await import("node:fs/promises");await fs.mkdir(".sites-runtime",{recursive:true});const db=new DatabaseSync(".sites-runtime/orders-dev.sqlite");db.exec("CREATE TABLE IF NOT EXISTS documents (path TEXT PRIMARY KEY, data TEXT NOT NULL)");return db;})();
  return localPromise;
}
const hasBlob=()=>!(process.env.MAA_LOCAL_TEST_MODE==="1"&&process.env.NODE_ENV==="development"&&!process.env.VERCEL)&&Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN);
export async function readDocument<T>(pathname:string):Promise<T|null>{
  if(!hasBlob()){const row=(await localDb()).prepare("SELECT data FROM documents WHERE path=?").get(pathname) as {data:string}|undefined;return row?JSON.parse(row.data):null;}
  const result=await get(pathname,{access:"private",useCache:false});
  if(!result)return null;
  if(result.statusCode!==200)throw new Error("Could not read order storage.");
  return await new Response(result.stream).json() as T;
}
export async function createDocument(pathname:string,document:unknown){
  const data=JSON.stringify(document);
  if(!hasBlob()){(await localDb()).prepare("INSERT INTO documents (path,data) VALUES (?,?)").run(pathname,data);return;}
  await put(pathname,data,{access:"private",contentType:"application/json",addRandomSuffix:false,allowOverwrite:false});
}
export async function referenceForKey(key:string){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(key));return "MAA-"+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("").slice(0,12).toUpperCase();}
export const readOrder=(reference:string)=>readDocument<SavedOrder>(`orders/${reference}.json`);
export const createOrder=(order:SavedOrder)=>createDocument(`orders/${order.reference}.json`,order);
export const saveMessage=(message:{name:string;email:string;message:string})=>createDocument(`messages/${crypto.randomUUID()}.json`,{...message,createdAt:new Date().toISOString()});
export async function removeLocalDocument(pathname:string){
  if(hasBlob())throw new Error("This helper is for local development only.");
  (await localDb()).prepare("DELETE FROM documents WHERE path=?").run(pathname);
}

// List one bounded page. Cursor ordering is storage ordering, not purchase time.
export async function listDocuments(prefix:string,cursor?:string,limit=25):Promise<{paths:string[];cursor?:string}>{
  if(!hasBlob()){
    const after=cursor?Buffer.from(cursor,"base64url").toString("utf8"):"";
    const rows=(await localDb()).prepare("SELECT path FROM documents WHERE path LIKE ? AND path > ? ORDER BY path LIMIT ?").all(prefix+"%",after,limit+1) as {path:string}[];
    const paths=rows.slice(0,limit).map(r=>r.path);
    return {paths,cursor:rows.length>limit?Buffer.from(paths[paths.length-1]).toString("base64url"):undefined};
  }
  const page=await list({prefix,cursor,limit});
  return {paths:page.blobs.map(b=>b.pathname),cursor:page.hasMore?page.cursor:undefined};
}

export async function readFulfilment(order:SavedOrder):Promise<Fulfilment>{
  const history:OrderEvent[]=[];
  let cursor:string|undefined;
  do{
    const page=await listDocuments(`fulfilment/${order.reference}/`,cursor,100);
    const events=await Promise.all(page.paths.map(path=>readDocument<OrderEvent>(path)));
    for(const event of events)if(event)history.push(event);
    cursor=page.cursor;
  }while(cursor);
  history.sort((a,b)=>a.version-b.version);
  const latest=history.at(-1);
  return {version:latest?.version??0,status:latest?.status??order.status,shipment:latest?.shipment??null,updatedAt:latest?.createdAt??order.createdAt,history};
}

export async function updateFulfilment(order:SavedOrder,input:unknown,actor:string){
  const next=fulfilmentUpdate.parse(input);
  const current=await readFulfilment(order);
  validateTransition(current,next);
  const event:OrderEvent={version:current.version+1,status:next.status,shipment:next.shipment,actor,createdAt:new Date().toISOString()};
  // One immutable document per revision acts as a compare-and-set. Concurrent
  // saves cannot overwrite one another; the losing request returns a conflict.
  const path=`fulfilment/${order.reference}/${String(event.version).padStart(8,"0")}.json`;
  try{await createDocument(path,event);}catch(error){if(await readDocument<OrderEvent>(path))throw new OrderConflictError("This order changed in another window. Refresh it before saving.");throw error;}
  return {...current,version:event.version,status:event.status,shipment:event.shipment,updatedAt:event.createdAt,history:[...current.history,event]};
}
