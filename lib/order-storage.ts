import { get, put } from "@vercel/blob";
export type SavedOrder = {
  reference:string; fingerprint:string; name:string; email:string; phone:string; address:string; city:string; state:string; postcode:string;
  subtotal:number;discount:number;shipping:number;total:number;currency:"INR";coupon:string;status:string;paymentMethod:"cod";createdAt:string;
  items:{productId:string;name:string;quantity:number;unitPrice:number;total:number}[];
};
let localPromise:Promise<import("node:sqlite").DatabaseSync>|undefined;
async function localDb(){
  if(process.env.VERCEL||process.env.NODE_ENV!=="development")throw new Error("Connect a private Vercel Blob store before accepting orders.");
  localPromise??=(async()=>{const {DatabaseSync}=await import("node:sqlite");const fs=await import("node:fs/promises");await fs.mkdir(".sites-runtime",{recursive:true});const db=new DatabaseSync(".sites-runtime/orders-dev.sqlite");db.exec("CREATE TABLE IF NOT EXISTS documents (path TEXT PRIMARY KEY, data TEXT NOT NULL)");return db;})();
  return localPromise;
}
const useBlob=()=>Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN);
async function readDocument<T>(pathname:string):Promise<T|null>{
  if(!useBlob()){const row=(await localDb()).prepare("SELECT data FROM documents WHERE path=?").get(pathname) as {data:string}|undefined;return row?JSON.parse(row.data):null;}
  const result=await get(pathname,{access:"private",useCache:false});
  if(!result)return null;
  if(result.statusCode!==200)throw new Error("Could not read order storage.");
  return await new Response(result.stream).json() as T;
}
async function createDocument(pathname:string,document:unknown){
  const data=JSON.stringify(document);
  if(!useBlob()){(await localDb()).prepare("INSERT INTO documents (path,data) VALUES (?,?)").run(pathname,data);return;}
  await put(pathname,data,{access:"private",contentType:"application/json",addRandomSuffix:false,allowOverwrite:false});
}
export async function referenceForKey(key:string){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(key));return "MAA-"+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("").slice(0,12).toUpperCase();}
export const readOrder=(reference:string)=>readDocument<SavedOrder>(`orders/${reference}.json`);
export const createOrder=(order:SavedOrder)=>createDocument(`orders/${order.reference}.json`,order);
export const saveMessage=(message:{name:string;email:string;message:string})=>createDocument(`messages/${crypto.randomUUID()}.json`,{...message,createdAt:new Date().toISOString()});
