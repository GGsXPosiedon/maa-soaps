import fs from "node:fs/promises";
import {generateSQLiteDrizzleJson,generateSQLiteMigration} from "drizzle-kit/api";
import * as schema from "../db/schema.ts";
// Drizzle's API avoids the config-loader subprocess on restricted Windows hosts.
await fs.mkdir("drizzle/meta",{recursive:true});
try{const journal=JSON.parse(await fs.readFile("drizzle/meta/_journal.json","utf8"));if(journal.entries?.length)throw new Error("Migrations already exist. Use drizzle-kit generate to append a migration.");}catch(e){if(e.code!=="ENOENT")throw e;}
const empty=await generateSQLiteDrizzleJson({});
const current=await generateSQLiteDrizzleJson(schema,empty.id);
const statements=await generateSQLiteMigration(empty,current);
await fs.writeFile("drizzle/0000_maa_orders.sql",statements.join("\n--> statement-breakpoint\n")+"\n");
await fs.writeFile("drizzle/meta/0000_snapshot.json",JSON.stringify(current,null,2));
await fs.writeFile("drizzle/meta/_journal.json",JSON.stringify({version:"7",dialect:"sqlite",entries:[{idx:0,version:"6",when:Date.now(),tag:"0000_maa_orders",breakpoints:true}]},null,2));
console.log(`Generated initial schema-only migration with ${statements.length} statements.`);
