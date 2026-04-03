import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { loadEnvLocal } from "./src/scripts/lib/meta-script-utils";
loadEnvLocal(__dirname);

import { createClient } from "@supabase/supabase-js";
import { MetaService } from "./src/lib/api/meta";
import { decrypt } from "./src/lib/crypto";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("access_token")
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .limit(1)
    .single();

  if (!adAccount) {
    console.log("No ad account");
    return;
  }
  
  const token = decrypt(adAccount.access_token);
  
  const states = ["Kano State", "Kaduna State", "Sokoto State", "Enugu State", "Bauchi State", "Gombe State", "Katsina State", "Oyo State", "Plateau State"];
  for (const s of states) {
    const reg = await MetaService.searchLocation(token, s, "region");
    if(reg.length > 0) {
        console.log(`✅ ${s} ->`, reg[0].name, `(key: ${reg[0].key}, type: ${reg[0].type})`);
    } else {
        console.log(`❌ ${s} -> not found`);
    }
  }
}

main().catch(console.error);
